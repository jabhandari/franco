import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID, createHmac } from "node:crypto";
import { Readable } from "node:stream";
import { PGlite } from "@electric-sql/pglite";
import { createChatService, mintChatJwt, keyMatches } from "../server/chat.js";
import {
  validatePseudonym,
  validateChatMessage,
  GUIDELINES_VERSION,
} from "../server/chat-policy.js";
import { runChatJobs, scoreChatText } from "../server/chat-jobs.js";
import { createChatRouter, chatBody } from "../server/chat-routes.js";
const db = new PGlite();
await db.exec(`CREATE TABLE users(id text PRIMARY KEY,created_at timestamptz DEFAULT NOW()-INTERVAL '2 days');
CREATE ROLE authenticated; CREATE ROLE anon;
CREATE SCHEMA auth; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE SCHEMA realtime; CREATE TABLE realtime.messages(id integer, extension text); ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic',true) $$;
GRANT USAGE ON SCHEMA public,auth,realtime TO authenticated,anon;
GRANT SELECT,INSERT ON realtime.messages TO authenticated;`);
const migration = await readFile(
  new URL(
    "../supabase/migrations/20261016034539_member_chat.sql",
    import.meta.url,
  ),
  "utf8",
);
await db.exec(migration);
await db.exec(migration); // Idempotent boot / canonical migration.
const pool = {
  query: (sql, args) => db.query(sql, args),
  connect: async () => ({
    query: (sql, args) => db.query(sql, args),
    release() {},
  }),
};
const conf = {
  enabled: true,
  guidelinesApproved: true,
  moderationKey: "test-provider",
  url: "https://example.supabase.co",
  publishableKey: "sb_publishable_fixture",
  jwtSecret: "a".repeat(40),
  privateRealtime: true,
  moderatorKey: "moderator-only",
  jobKey: "job-only",
};
const config = () => conf;
const service = createChatService(pool, { config });
const alice = {
  id: "account-alice",
  name: "Alice Smith",
  first_name: "Alice",
  last_name: "Smith",
  email: "alice@example.test",
  expires_at: new Date(Date.now() + 3600000),
};
const bob = {
  ...alice,
  id: "account-bob",
  name: "Bob Jones",
  first_name: "Bob",
  last_name: "Jones",
  email: "bob@example.test",
};
await db.query("INSERT INTO users(id) VALUES($1),($2),($3)", [
  alice.id,
  bob.id,
  "new-account",
]);
const setup = (user, name) =>
  service.setup(user, {
    display_name: name,
    accept_guidelines: true,
    guidelines_version: GUIDELINES_VERSION,
  });
const msg = (body = "Bonjour, comment allez-vous ?") => ({
  body,
  client_msg_id: randomUUID(),
});
const rejected = (fn, status) => assert.rejects(fn, (e) => e.status === status);
assert.throws(() => validatePseudonym("Alice_chat", alice));
assert.throws(() => validatePseudonym("modérateur", alice));
assert.equal(validatePseudonym("PetitNuage", alice), "PetitNuage");
assert.throws(() =>
  validateChatMessage(msg("contact alice@example.com"), false),
);
assert.throws(() =>
  validateChatMessage(msg("appelle +33 6 12 34 56 78"), false),
);
assert.throws(() => validateChatMessage(msg("fuck you"), false));
assert.throws(() => validateChatMessage(msg("https://evil.example"), false));
assert.throws(() =>
  validateChatMessage(msg("https://apprendre.tv5monde.com"), true),
);
assert.equal(
  validateChatMessage(msg("https://apprendre.tv5monde.com/fr"), false).body,
  "https://apprendre.tv5monde.com/fr",
);
assert.equal(
  validateChatMessage(
    msg("Hello, what are you learning with this word?"),
    false,
  ).frenchNudge,
  true,
);
await rejected(() => service.history(alice.id, "general"), 403);
await rejected(() => service.setup(alice, { display_name: "PetitNuage" }), 400);
await setup(alice, "PetitNuage");
await setup(bob, "LuneBleue");
await rejected(() => setup(bob, "petitnuage"), 409);
assert.equal((await service.channels(alice.id)).channels.length, 5);
const firstInput = msg();
const first = await service.send(alice.id, "general", firstInput);
assert.equal(first.message.display_name, "PetitNuage");
assert.equal(
  (await service.send(alice.id, "general", firstInput)).deduplicated,
  true,
);
await rejected(() => service.send(alice.id, "questions-aide", firstInput), 409);
await rejected(() => service.send(alice.id, "general", msg()), 429);
assert.equal(
  (await db.query("SELECT COUNT(*)::int AS n FROM chat_messages")).rows[0].n,
  1,
);
const visible = (await service.history(bob.id, "general")).messages[0];
assert.equal(visible.own, false);
assert.equal(visible.body, firstInput.body);
assert.deepEqual(
  Object.keys(visible).sort(),
  [
    "id",
    "seq",
    "channel_id",
    "display_name",
    "body",
    "status",
    "own",
    "created_at",
  ].sort(),
);
assert.ok(!JSON.stringify(visible).includes("account-alice"));
assert.equal((await service.channels(bob.id)).channels[0].unread, 1);
await service.markRead(bob.id, "general", { message_id: first.message.id });
assert.equal((await service.channels(bob.id)).channels[0].unread, 0);
await rejected(
  () =>
    service.markRead(bob.id, "questions-aide", {
      message_id: first.message.id,
    }),
  404,
);
await rejected(() => service.removeOwn(bob.id, first.message.id), 404);
await service.report(bob.id, first.message.id, { reason: "spam" });
await service.report(bob.id, first.message.id, { reason: "spam" });
assert.equal(
  (await db.query("SELECT COUNT(*)::int AS n FROM chat_reports")).rows[0].n,
  1,
);
assert.equal((await service.moderationQueue()).messages[0].reports, 1);
await service.moderate("key:test", {
  message_id: first.message.id,
  action: "mute",
  reason: "spam",
  duration_seconds: 3600,
});
await rejected(
  () => service.send(alice.id, "questions-aide", msg("Bonjour tout le monde")),
  403,
); // A queued pre-mute message must fail.
assert.equal((await service.history(alice.id, "general")).messages.length, 1); // mute preserves reading.
await db.query(
  "UPDATE chat_mod_actions SET expires_at=NOW()-INTERVAL '1 second' WHERE action='mute'",
);
const second = await service.send(
  alice.id,
  "questions-aide",
  msg("Merci pour votre aide."),
);
await service.markRead(bob.id, "questions-aide", {
  message_id: second.message.id,
});
await service.removeOwn(alice.id, second.message.id);
assert.equal(
  (await service.history(bob.id, "questions-aide")).messages[0].body,
  "",
);
await rejected(
  () =>
    service.moderate("key:test", {
      message_id: second.message.id,
      action: "dismiss",
      reason: "other",
    }),
  409,
);
const jwtTicket = await service.realtimeToken(alice);
const [header, payload, signature] = jwtTicket.token.split(".");
const claims = JSON.parse(Buffer.from(payload, "base64url"));
assert.equal(
  signature,
  createHmac("sha256", conf.jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url"),
);
assert.equal(claims.role, "authenticated");
assert.equal(claims.purpose, "franco_chat");
assert.ok(claims.exp - claims.iat <= 60);
assert.ok(!JSON.stringify(claims).includes(alice.id));
assert.ok(!JSON.stringify(claims).includes(alice.email));
assert.deepEqual(
  (await service.presence(bob.id, jwtTicket.presence_key)).members,
  ["PetitNuage"],
);
// Even a permissive policy from a separate feature cannot open chat topics.
await db.exec(
  "CREATE POLICY broad_other_feature ON realtime.messages FOR ALL TO authenticated USING(true) WITH CHECK(true);",
);
await db.query(
  "SELECT set_config('request.jwt.claims',$1,false),set_config('realtime.topic','chat:general',false)",
  [JSON.stringify(claims)],
);
await db.exec(
  "INSERT INTO realtime.messages VALUES(1,'broadcast'); INSERT INTO realtime.messages VALUES(2,'presence'); SET ROLE authenticated;",
);
assert.equal(
  (await db.query("SELECT * FROM realtime.messages")).rows.length,
  2,
);
await assert.rejects(() =>
  db.query("INSERT INTO realtime.messages VALUES(3,'broadcast')"),
);
await db.query("INSERT INTO realtime.messages VALUES(4,'presence')");
await assert.rejects(() => db.query("SELECT * FROM chat_messages"));
await assert.rejects(() => db.query("SELECT * FROM chat_profiles"));
assert.equal(
  (await db.query("SELECT * FROM chat_realtime_leases")).rows.length,
  1,
);
await db.exec("RESET ROLE;");
await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
  JSON.stringify({ ...claims, chat_lease: randomUUID() }),
]);
await db.exec("SET ROLE authenticated;");
assert.equal(
  (await db.query("SELECT * FROM realtime.messages")).rows.length,
  0,
);
await assert.rejects(() =>
  db.query("INSERT INTO realtime.messages VALUES(5,'presence')"),
);
await db.exec("RESET ROLE; SET ROLE anon;");
await assert.rejects(() => db.query("SELECT * FROM chat_messages"));
await db.exec("RESET ROLE;");
await service.moderate("key:test", {
  message_id: first.message.id,
  action: "ban",
  reason: "harassment",
});
await rejected(() => service.history(alice.id, "general"), 403);
await rejected(() => service.realtimeToken(alice), 403);
assert.deepEqual(
  (await service.presence(bob.id, jwtTicket.presence_key)).members,
  [],
);
assert.ok(
  !(await db.query("SELECT * FROM chat_mod_actions")).rows.some(
    (row) => "body" in row,
  ),
);
await db.query("DELETE FROM chat_mod_actions WHERE action='ban'");
await db.query(
  "UPDATE chat_messages SET created_at=NOW()-INTERVAL '40 days' WHERE id=$1",
  [first.message.id],
);
assert.equal((await service.history(bob.id, "general")).messages.length, 0);
const cleanup = await runChatJobs(pool, {
  config,
  score: async () => ({ score: 0.9, status: "hidden" }),
});
assert.equal(cleanup.removed, 1);
assert.equal((await db.query("SELECT * FROM chat_reports")).rows.length, 0);
assert.equal(
  (
    await db.query(
      "SELECT last_read_message_id FROM chat_read_markers WHERE channel_id=$1",
      ["general"],
    )
  ).rows[0].last_read_message_id,
  null,
);
assert.ok((await db.query("SELECT * FROM chat_mod_actions")).rows.length > 0);
const held = await service.send(bob.id, "general", msg("Salut !"));
await runChatJobs(pool, {
  config,
  score: async () => {
    throw Error("outage");
  },
});
assert.equal(
  (await service.history(bob.id, "general")).messages[0].status,
  "hidden",
);
assert.equal((await service.history(bob.id, "general")).messages[0].body, "");
await db.query(
  "UPDATE chat_messages SET moderation_retry_at=NOW() WHERE id=$1",
  [held.message.id],
);
await runChatJobs(pool, {
  config,
  score: async () => ({ score: 0.1, status: "visible" }),
});
assert.equal(
  (await service.history(bob.id, "general")).messages[0].status,
  "visible",
);
await db.query(
  "UPDATE chat_messages SET moderation_state='pending',moderation_retry_at=NOW() WHERE id=$1",
  [held.message.id],
);
await runChatJobs(pool, {
  config,
  score: async () => {
    await service.removeOwn(bob.id, held.message.id);
    return { score: 0, status: "visible" };
  },
});
assert.equal(
  (await service.history(bob.id, "general")).messages[0].status,
  "deleted",
);
await service.history(bob.id, "general", "9999999999999999999"); // Never a bigint-overflow 500.
const provider = (score) =>
  scoreChatText("fixture", {
    key: "fixture",
    fetcher: async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/moderations");
      assert.equal(JSON.parse(options.body).model, "omni-moderation-latest");
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              flagged: false,
              category_scores: { harassment: score },
              categories: {},
            },
          ],
        }),
      };
    },
  });
assert.equal((await provider(0.9)).status, "hidden");
assert.equal((await provider(0.4)).status, "flagged");
assert.equal((await provider(0.1)).status, "visible");
await assert.rejects(() =>
  scoreChatText("fixture", {
    key: "fixture",
    fetcher: async () => ({ ok: true, json: async () => ({ results: [] }) }),
  }),
);
assert.equal(keyMatches("moderator-only", conf.moderatorKey), true);
assert.equal(keyMatches("job-only", conf.moderatorKey), false);
assert.equal(keyMatches("", ""), false);
const router = createChatRouter(pool, {
  config,
  authenticate: async (req) =>
    req.headers.authorization === "Bearer fixture" ? bob : null,
  respond: (res, status, body) => Object.assign(res, { status, body }),
  jobs: async () => ({ removed: 0, processed: 0 }),
});
async function route(
  path,
  { method = "GET", auth = "", key = "", body = {} } = {},
) {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.headers = { authorization: auth, "x-api-key": key };
  const res = {};
  await router(req, res, new URL(path, "http://test"));
  return res;
}
for (const path of [
  "/api/chat/bootstrap",
  "/api/chat/channels",
  "/api/chat/channels/general/messages",
  "/api/chat/presence",
  "/api/chat/realtime-token",
  "/api/chat/profile",
])
  assert.equal((await route(path)).status, 401);
assert.equal(
  (await route("/api/chat/moderation", { auth: "Bearer fixture" })).status,
  401,
);
assert.equal(
  (await route("/api/chat/moderation", { key: "job-only" })).status,
  401,
);
assert.equal(
  (await route("/api/chat/moderation", { key: "moderator-only" })).status,
  200,
);
assert.equal(
  (await route("/api/chat/jobs/run", { method: "POST", key: "moderator-only" }))
    .status,
  401,
);
assert.equal(
  (await route("/api/chat/jobs/run", { method: "POST", key: "job-only" }))
    .status,
  200,
);
assert.equal(
  (await route("/api/chat/channels", { auth: "Bearer fixture" })).status,
  200,
);
await assert.rejects(
  () => chatBody(Readable.from(["x".repeat(9000)])),
  (e) => e.status === 413,
);
// Catch-up and pagination must retain every message after a long disconnect.
await db.query(
  `INSERT INTO chat_messages(channel_id,user_id,display_name,body,client_msg_id,moderation_state)
 SELECT 'general',$1,'PetitNuage','Rattrapage '||n,gen_random_uuid(),'done' FROM generate_series(1,75) n`,
  [alice.id],
);
const newest = await service.history(bob.id, "general");
assert.equal(newest.messages.length, 50);
assert.equal(newest.has_more, true);
const older = await service.history(bob.id, "general", newest.before);
const combined = [...older.messages, ...newest.messages];
assert.equal(new Set(combined.map((row) => row.id)).size, combined.length);
assert.equal(
  combined.filter((row) => row.body.startsWith("Rattrapage ")).length,
  75,
);
const latest = newest.messages.at(-1);
await service.markRead(bob.id, "general", { message_id: latest.id });
await service.markRead(bob.id, "general", { message_id: older.messages[0].id });
assert.equal(
  (await service.history(bob.id, "general")).last_read_seq,
  latest.seq,
);
// New-account restrictions, explicit reacceptance and session-bounded tokens.
await db.query("UPDATE users SET created_at=NOW() WHERE id=$1", [
  "new-account",
]);
const fresh = { ...alice, id: "new-account" };
await setup(fresh, "SoleilVert");
await rejected(
  () =>
    service.send(
      fresh.id,
      "questions-aide",
      msg("https://apprendre.tv5monde.com"),
    ),
  422,
);
await service.send(fresh.id, "questions-aide", msg("Bonjour !"));
await rejected(
  () => service.send(fresh.id, "questions-aide", msg("Merci !")),
  429,
);
await db.query(
  "UPDATE chat_profiles SET guidelines_version=$1 WHERE user_id=$2",
  ["old-version", fresh.id],
);
assert.equal((await service.bootstrap(fresh)).profile, null);
await rejected(() => service.history(fresh.id, "general"), 403);
await setup(fresh, "SoleilVert");
const shortTicket = await service.realtimeToken({
  ...fresh,
  expires_at: new Date(Date.now() + 5000),
});
const shortClaims = JSON.parse(
  Buffer.from(shortTicket.token.split(".")[1], "base64url"),
);
assert.ok(shortClaims.exp - shortClaims.iat <= 5);
await rejected(
  () =>
    service.realtimeToken({ ...fresh, expires_at: new Date(Date.now() - 1) }),
  401,
);
conf.privateRealtime = false;
await rejected(() => service.realtimeToken(fresh), 503);
conf.privateRealtime = true;
assert.throws(() => validateChatMessage(msg("evil.com"), false));
conf.enabled = false;
await rejected(() => service.channels(bob.id), 503);
conf.enabled = true;
conf.guidelinesApproved = false;
await rejected(() => service.channels(bob.id), 503);
await db.close();
console.log(
  "Chat: member auth, private identity, RLS, leases, moderation, dedupe, sanctions, retention and scoped routes pass.",
);
