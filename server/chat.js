import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  ChatError,
  chatConfig,
  CHAT_CHANNELS,
  GUIDELINES,
  GUIDELINES_VERSION,
  REPORT_REASONS,
  validateChatMessage,
  validatePseudonym,
} from "./chat-policy.js";
export const keyMatches = (supplied, expected) =>
  Boolean(expected) &&
  typeof supplied === "string" &&
  timingSafeEqual(
    createHash("sha256").update(supplied).digest(),
    createHash("sha256").update(expected).digest(),
  );
const uuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const seq = (value) =>
  typeof value === "string" &&
  /^\d{1,19}$/.test(value) &&
  BigInt(value) <= 9223372036854775807n
    ? value
    : "0";
export function mintChatJwt(
  memberId,
  leaseId,
  secret,
  expiresAt,
  now = Date.now(),
) {
  const b = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = b({ alg: "HS256", typ: "JWT" }),
    payload = b({
      iss: "supabase",
      aud: "authenticated",
      role: "authenticated",
      sub: memberId,
      purpose: "franco_chat",
      chat_lease: leaseId,
      iat: Math.floor(now / 1000),
      exp: Math.floor(expiresAt / 1000),
    });
  return `${head}.${payload}.${createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url")}`;
}
export function createChatService(
  pool,
  { config = chatConfig, now = () => Date.now() } = {},
) {
  const query = (sql, args = []) => pool.query(sql, args).then((r) => r.rows);
  async function transaction(fn) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const value = await fn(c);
      await c.query("COMMIT");
      return value;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  function enabled() {
    const c = config();
    if (!c.enabled || !c.guidelinesApproved)
      throw new ChatError(
        503,
        "Chat is not available yet. Please check back soon.",
      );
    return c;
  }
  async function profile(client, userId, allowMissing = false) {
    const p = (
      await client.query(
        "SELECT p.*,u.created_at AS account_created_at FROM chat_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1",
        [userId],
      )
    ).rows[0];
    if (!p) {
      if (allowMissing) return null;
      throw new ChatError(
        403,
        "Choose a chat name and accept the guidelines first.",
      );
    }
    if (p.guidelines_version !== GUIDELINES_VERSION && !allowMissing)
      throw new ChatError(
        403,
        "Please accept the updated community guidelines.",
      );
    const ban = (
      await client.query(
        "SELECT 1 FROM chat_mod_actions WHERE target_user_id=$1 AND action='ban' AND (expires_at IS NULL OR expires_at>NOW()) LIMIT 1",
        [userId],
      )
    ).rows[0];
    if (ban) throw new ChatError(403, "Your chat access has been suspended.");
    return allowMissing && p.guidelines_version !== GUIDELINES_VERSION
      ? null
      : p;
  }
  const member = async (id) => {
    enabled();
    return profile(pool, id);
  };
  function shape(row, userId) {
    return {
      id: row.id,
      seq: String(row.seq),
      channel_id: row.channel_id,
      display_name: row.display_name,
      body: ["visible", "flagged"].includes(row.status) ? row.body : "",
      status: row.status,
      own: row.user_id === userId,
      created_at: row.created_at,
    };
  }
  async function bootstrap(user) {
    const c = config(),
      p = await profile(pool, user.id, true);
    return {
      available: c.enabled && c.guidelinesApproved,
      guidelines: GUIDELINES,
      guidelines_version: GUIDELINES_VERSION,
      guidelines_approved: c.guidelinesApproved,
      profile: p
        ? { display_name: p.display_name, is_moderator: p.is_moderator }
        : null,
    };
  }
  async function setup(user, input) {
    enabled();
    if (
      input.accept_guidelines !== true ||
      input.guidelines_version !== GUIDELINES_VERSION
    )
      throw new ChatError(
        400,
        "Accept the current community guidelines to continue.",
      );
    const name = validatePseudonym(input.display_name, user);
    return transaction(async (c) => {
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      await c.query(
        `INSERT INTO chat_profiles(user_id,display_name,guidelines_version) VALUES($1,$2,$3)
        ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,guidelines_version=EXCLUDED.guidelines_version,guidelines_accepted_at=NOW()`,
        [user.id, name, GUIDELINES_VERSION],
      );
      return { display_name: name };
    }).catch((e) => {
      if (e.code === "23505")
        throw new ChatError(
          409,
          "That chat name is already taken. Choose another.",
        );
      throw e;
    });
  }
  async function channels(userId) {
    await member(userId);
    return {
      channels: await query(
        `SELECT c.*,COALESCE(r.last_read_seq,0)::text AS last_read_seq,
      (SELECT COUNT(*)::int FROM chat_messages m WHERE m.channel_id=c.slug AND m.seq>COALESCE(r.last_read_seq,0) AND m.user_id<>$1 AND m.status IN ('visible','flagged') AND m.created_at>NOW()-INTERVAL '28 days') AS unread
      FROM chat_channels c LEFT JOIN chat_read_markers r ON r.channel_id=c.slug AND r.user_id=$1 ORDER BY c.sort_order`,
        [userId],
      ),
    };
  }
  async function history(userId, slug, before = "0") {
    await member(userId);
    if (!CHAT_CHANNELS.includes(slug))
      throw new ChatError(404, "Channel not found.");
    const rows = await query(
      `SELECT * FROM chat_messages WHERE channel_id=$1 AND created_at>NOW()-INTERVAL '28 days' AND ($2::bigint=0 OR seq<$2::bigint) ORDER BY seq DESC LIMIT 51`,
      [slug, seq(before)],
    );
    const hasMore = rows.length > 50,
      page = rows.slice(0, 50).reverse();
    const marker = (
      await query(
        "SELECT last_read_seq::text FROM chat_read_markers WHERE user_id=$1 AND channel_id=$2",
        [userId, slug],
      )
    )[0];
    return {
      messages: page.map((r) => shape(r, userId)),
      has_more: hasMore,
      before: page[0] ? String(page[0].seq) : null,
      last_read_seq: marker?.last_read_seq || "0",
    };
  }
  async function send(userId, slug, input) {
    const conf = enabled();
    if (!CHAT_CHANNELS.includes(slug))
      throw new ChatError(404, "Channel not found.");
    return transaction(async (c) => {
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
      const p = await profile(c, userId);
      const sanction = (
        await c.query(
          "SELECT expires_at FROM chat_mod_actions WHERE target_user_id=$1 AND action='mute' AND expires_at>NOW() ORDER BY expires_at DESC LIMIT 1",
          [userId],
        )
      ).rows[0];
      if (sanction)
        throw new ChatError(
          403,
          "You are muted in chat until " +
            new Date(sanction.expires_at).toISOString(),
        );
      const isNew = now() - new Date(p.account_created_at).getTime() < 86400000;
      const message = validateChatMessage(input, isNew);
      const existing = (
        await c.query(
          "SELECT * FROM chat_messages WHERE user_id=$1 AND client_msg_id=$2",
          [userId, message.clientMsgId],
        )
      ).rows[0];
      if (existing) {
        if (existing.channel_id !== slug || existing.body !== message.body)
          throw new ChatError(
            409,
            "This message ID was already used for a different message.",
          );
        return {
          message: shape(existing, userId),
          french_nudge: message.frenchNudge,
          deduplicated: true,
        };
      }
      const recent = (
        await c.query(
          "SELECT COUNT(*)::int AS count FROM chat_messages WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 minute'",
          [userId],
        )
      ).rows[0].count;
      if (recent >= (isNew ? 5 : 15))
        throw new ChatError(429, "Please slow down and try again shortly.", 60);
      const channel = (
        await c.query(
          "SELECT slow_mode_seconds FROM chat_channels WHERE slug=$1",
          [slug],
        )
      ).rows[0];
      const last = (
        await c.query(
          "SELECT created_at FROM chat_messages WHERE user_id=$1 AND channel_id=$2 ORDER BY created_at DESC LIMIT 1",
          [userId, slug],
        )
      ).rows[0];
      const wait = Math.max(channel.slow_mode_seconds, isNew ? 10 : 0);
      if (last && now() - new Date(last.created_at).getTime() < wait * 1000)
        throw new ChatError(
          429,
          `Wait ${wait} seconds between messages in this room.`,
          wait,
        );
      const status = conf.moderationKey ? "visible" : "hidden";
      const row = (
        await c.query(
          "INSERT INTO chat_messages(channel_id,user_id,display_name,body,client_msg_id,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
          [
            slug,
            userId,
            p.display_name,
            message.body,
            message.clientMsgId,
            status,
          ],
        )
      ).rows[0];
      return {
        message: shape(row, userId),
        french_nudge: message.frenchNudge,
        deduplicated: false,
      };
    });
  }
  async function markRead(userId, slug, input) {
    await member(userId);
    if (!CHAT_CHANNELS.includes(slug) || !uuid(input.message_id))
      throw new ChatError(400, "Choose a valid message.");
    const row = (
      await query(
        "SELECT id,seq FROM chat_messages WHERE id=$1 AND channel_id=$2 AND created_at>NOW()-INTERVAL '28 days'",
        [input.message_id, slug],
      )
    )[0];
    if (!row) throw new ChatError(404, "Message not found.");
    await query(
      `INSERT INTO chat_read_markers(user_id,channel_id,last_read_message_id,last_read_seq) VALUES($1,$2,$3,$4)
      ON CONFLICT(user_id,channel_id) DO UPDATE SET last_read_message_id=CASE WHEN EXCLUDED.last_read_seq>=chat_read_markers.last_read_seq THEN EXCLUDED.last_read_message_id ELSE chat_read_markers.last_read_message_id END,last_read_seq=GREATEST(chat_read_markers.last_read_seq,EXCLUDED.last_read_seq)`,
      [userId, slug, row.id, row.seq],
    );
    return { saved: true };
  }
  async function removeOwn(userId, id) {
    await member(userId);
    if (!uuid(id)) throw new ChatError(404, "Message not found.");
    const row = (
      await query(
        "UPDATE chat_messages SET status='deleted',reviewed_at=NOW(),moderation_state='manual' WHERE id=$1 AND user_id=$2 AND created_at>NOW()-INTERVAL '28 days' RETURNING id",
        [id, userId],
      )
    )[0];
    if (!row) throw new ChatError(404, "Message not found.");
    return { deleted: true };
  }
  async function report(userId, id, input) {
    await member(userId);
    if (!uuid(id) || !REPORT_REASONS.includes(input.reason))
      throw new ChatError(400, "Choose a valid report reason.");
    return transaction(async (c) => {
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
      const count = (
        await c.query(
          "SELECT COUNT(*)::int AS n FROM chat_reports WHERE reporter_user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",
          [userId],
        )
      ).rows[0].n;
      if (count >= 20)
        throw new ChatError(
          429,
          "Please wait before submitting more reports.",
          3600,
        );
      const target = (
        await c.query(
          "SELECT id FROM chat_messages WHERE id=$1 AND created_at>NOW()-INTERVAL '28 days'",
          [id],
        )
      ).rows[0];
      if (!target) throw new ChatError(404, "Message not found.");
      await c.query(
        "INSERT INTO chat_reports(message_id,reporter_user_id,reason) VALUES($1,$2,$3) ON CONFLICT(message_id,reporter_user_id) DO NOTHING",
        [id, userId, input.reason],
      );
      await c.query(
        "UPDATE chat_messages SET status=CASE WHEN status='visible' THEN 'flagged' ELSE status END WHERE id=$1",
        [id],
      );
      return { reported: true };
    });
  }
  async function realtimeToken(user) {
    const c = enabled(),
      p = await profile(pool, user.id);
    if (!c.url || !c.publishableKey || !c.jwtSecret || !c.privateRealtime)
      throw new ChatError(
        503,
        "Live chat is temporarily unavailable. Your history is still saved.",
      );
    if (
      !/^https:\/\//.test(c.url) ||
      c.publishableKey.startsWith("sb_secret_") ||
      c.jwtSecret.length < 32
    )
      throw new ChatError(503, "Live chat is temporarily unavailable.");
    if (c.publishableKey.startsWith("eyJ")) {
      try {
        if (
          JSON.parse(Buffer.from(c.publishableKey.split(".")[1], "base64url"))
            .role !== "anon"
        )
          throw new Error();
      } catch {
        throw new ChatError(503, "Live chat is temporarily unavailable.");
      }
    }
    const expiresAt = Math.min(
      now() + 60000,
      new Date(user.expires_at).getTime(),
    );
    if (!Number.isFinite(expiresAt) || expiresAt <= now())
      throw new ChatError(401, "Please sign in again.");
    const lease = (
      await query(
        "INSERT INTO chat_realtime_leases(member_id,expires_at) VALUES($1,$2) RETURNING id",
        [p.member_id, new Date(expiresAt)],
      )
    )[0];
    return {
      token: mintChatJwt(p.member_id, lease.id, c.jwtSecret, expiresAt, now()),
      expires_at: new Date(expiresAt).toISOString(),
      url: c.url,
      publishable_key: c.publishableKey,
      presence_key: lease.id,
    };
  }
  async function presence(userId, ids) {
    await member(userId);
    const keys =
      typeof ids === "string" ? ids.split(",").filter(uuid).slice(0, 100) : [];
    if (!keys.length) return { members: [] };
    const rows = await query(
      "SELECT DISTINCT p.display_name FROM chat_realtime_leases l JOIN chat_profiles p ON p.member_id=l.member_id WHERE l.id=ANY($1::uuid[]) AND l.expires_at>NOW()",
      [keys],
    );
    return { members: rows.map((r) => r.display_name) };
  }
  async function moderationQueue() {
    return {
      messages:
        await query(`SELECT m.id,m.channel_id,m.display_name,m.body,m.status,m.toxicity_score,m.created_at,m.moderation_state,
      (SELECT COUNT(*)::int FROM chat_reports r WHERE r.message_id=m.id AND r.status='open') AS reports,
      (SELECT json_agg(json_build_object('reason',r.reason)) FROM chat_reports r WHERE r.message_id=m.id AND r.status='open') AS reasons,
      (SELECT json_agg(json_build_object('display_name',ctx.display_name,'body',ctx.body,'created_at',ctx.created_at) ORDER BY ctx.seq) FROM
        (SELECT nearby.display_name,nearby.body,nearby.created_at,nearby.seq FROM chat_messages nearby WHERE nearby.channel_id=m.channel_id AND nearby.id<>m.id AND nearby.created_at>NOW()-INTERVAL '28 days' ORDER BY ABS(nearby.seq-m.seq) LIMIT 6) ctx) AS context
      FROM chat_messages m WHERE m.created_at>NOW()-INTERVAL '28 days' AND (m.status IN ('flagged','hidden') OR EXISTS(SELECT 1 FROM chat_reports r WHERE r.message_id=m.id AND r.status='open'))
      ORDER BY m.created_at ASC LIMIT 100`),
    };
  }
  async function moderate(actor, input) {
    if (
      !uuid(input.message_id) ||
      !["delete", "mute", "ban", "dismiss"].includes(input.action) ||
      !REPORT_REASONS.includes(input.reason)
    )
      throw new ChatError(400, "Choose a message, action and reason.");
    const duration =
      input.action === "mute" ? Number(input.duration_seconds) : null;
    if (
      input.action === "mute" &&
      (!Number.isInteger(duration) || duration < 60 || duration > 2592000)
    )
      throw new ChatError(
        400,
        "Mute duration must be between one minute and 30 days.",
      );
    return transaction(async (c) => {
      const target = (
        await c.query("SELECT user_id FROM chat_messages WHERE id=$1", [
          input.message_id,
        ])
      ).rows[0];
      if (!target) throw new ChatError(404, "Message not found.");
      // Lock the user first, matching sends and reports to avoid lock inversion.
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        target.user_id,
      ]);
      const m = (
        await c.query(
          "SELECT * FROM chat_messages WHERE id=$1 AND created_at>NOW()-INTERVAL '28 days' FOR UPDATE",
          [input.message_id],
        )
      ).rows[0];
      if (!m) throw new ChatError(404, "Message not found.");
      if (input.action === "dismiss" && m.status === "deleted")
        throw new ChatError(409, "A deleted message cannot be restored.");
      const expires = duration ? new Date(now() + duration * 1000) : null;
      await c.query(
        "INSERT INTO chat_mod_actions(actor,target_user_id,target_message_id,action,duration_seconds,reason,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [actor, m.user_id, m.id, input.action, duration, input.reason, expires],
      );
      if (["delete", "dismiss"].includes(input.action))
        await c.query(
          "UPDATE chat_messages SET status=$1,reviewed_at=NOW(),moderation_state=$2 WHERE id=$3",
          [input.action === "delete" ? "deleted" : "visible", "manual", m.id],
        );
      if (input.action === "ban")
        await c.query(
          "DELETE FROM chat_realtime_leases WHERE member_id=(SELECT member_id FROM chat_profiles WHERE user_id=$1)",
          [m.user_id],
        );
      await c.query("UPDATE chat_reports SET status=$1 WHERE message_id=$2", [
        input.action === "dismiss" ? "dismissed" : "actioned",
        m.id,
      ]);
      return { action: input.action, saved: true };
    });
  }
  return {
    bootstrap,
    setup,
    channels,
    history,
    send,
    markRead,
    removeOwn,
    report,
    realtimeToken,
    presence,
    moderationQueue,
    moderate,
  };
}
