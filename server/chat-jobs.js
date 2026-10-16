import { chatConfig } from "./chat-policy.js";
export async function scoreChatText(body, { key, fetcher = fetch } = {}) {
  if (!key) throw new Error("Moderation is not configured.");
  const response = await fetcher("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Moderation provider unavailable.");
  const payload = await response.json(),
    result = payload?.results?.[0];
  const scores = Object.values(result?.category_scores || {});
  if (
    !scores.length ||
    !scores.every(
      (s) => typeof s === "number" && Number.isFinite(s) && s >= 0 && s <= 1,
    )
  )
    throw new Error("Invalid moderation result.");
  const score = Math.max(...scores),
    critical = [
      "sexual/minors",
      "hate/threatening",
      "harassment/threatening",
      "violence/graphic",
    ].some((k) => result.categories?.[k] === true);
  return {
    score,
    status:
      critical || score >= 0.8
        ? "hidden"
        : result.flagged || score >= 0.35
          ? "flagged"
          : "visible",
  };
}
export async function runChatJobs(
  pool,
  { config = chatConfig, score = scoreChatText, limit = 5 } = {},
) {
  const removed = (await pool.query("SELECT public.chat_cleanup() AS removed"))
    .rows[0].removed;
  const results = [];
  const cfg = config();
  for (let i = 0; i < Math.min(5, limit); i++) {
    const claim =
      await pool.query(`UPDATE chat_messages SET moderation_state='processing',moderation_retry_at=NOW()+INTERVAL '30 seconds',moderation_attempts=moderation_attempts+1
      WHERE id=(SELECT id FROM chat_messages WHERE moderation_state IN ('pending','processing') AND moderation_retry_at<=NOW() AND created_at>NOW()-INTERVAL '28 days' AND status<>'deleted' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,body,moderation_attempts`);
    const message = claim.rows[0];
    if (!message) break;
    try {
      const result = await score(message.body, { key: cfg.moderationKey });
      await pool.query(
        "UPDATE chat_messages SET toxicity_score=$1,status=$2,moderation_state='done' WHERE id=$3 AND moderation_state='processing' AND reviewed_at IS NULL AND status<>'deleted'",
        [result.score, result.status, message.id],
      );
      results.push({ id: message.id, status: result.status });
    } catch {
      await pool.query(
        "UPDATE chat_messages SET status='hidden',moderation_state=$1,moderation_retry_at=NOW()+INTERVAL '1 minute' * $2 WHERE id=$3 AND moderation_state='processing' AND reviewed_at IS NULL AND status<>'deleted'",
        [
          message.moderation_attempts >= 5 ? "manual" : "pending",
          Math.min(60, 2 ** message.moderation_attempts),
          message.id,
        ],
      );
      results.push({ id: message.id, status: "held_for_review" });
    }
  }
  return { removed, processed: results.length };
}
