import { createChatService, keyMatches } from "./chat.js";
import { chatConfig, ChatError } from "./chat-policy.js";
import { runChatJobs } from "./chat-jobs.js";
export async function chatBody(req) {
  let text = "",
    bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 8192) throw new ChatError(413, "Chat request is too large.");
    text += chunk;
  }
  let value;
  try {
    value = JSON.parse(text || "{}");
  } catch {
    throw new ChatError(400, "Invalid chat request.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ChatError(400, "Invalid chat request.");
  return value;
}
export function createChatRouter(
  pool,
  { authenticate, respond, config = chatConfig, jobs = runChatJobs } = {},
) {
  const service = createChatService(pool, { config });
  let worker = null;
  const wake = () => {
    if (!worker)
      worker = jobs(pool, { config, limit: 1 })
        .catch(() => {})
        .finally(() => {
          worker = null;
        });
  };
  return async (req, res, url) => {
    if (!url.pathname.startsWith("/api/chat/")) return false;
    try {
      const path = url.pathname,
        method = req.method,
        c = config();
      let result;
      if (path === "/api/chat/jobs/run" && method === "POST") {
        if (!keyMatches(req.headers["x-api-key"], c.jobKey))
          throw new ChatError(401, "A chat job key is required.");
        result = await jobs(pool, { config });
      } else if (path.startsWith("/api/chat/moderation")) {
        if (!keyMatches(req.headers["x-api-key"], c.moderatorKey))
          throw new ChatError(401, "A chat moderator key is required.");
        if (path === "/api/chat/moderation" && method === "GET")
          result = await service.moderationQueue();
        else if (path === "/api/chat/moderation/actions" && method === "POST")
          result = await service.moderate(
            "key:" + createKeyId(c.moderatorKey),
            await chatBody(req),
          );
        else throw new ChatError(404, "Chat endpoint not found.");
      } else {
        const user = await authenticate(req);
        if (!user) throw new ChatError(401, "Sign in to use chat.");
        if (path === "/api/chat/bootstrap" && method === "GET")
          result = await service.bootstrap(user);
        else if (path === "/api/chat/profile" && method === "POST")
          result = await service.setup(user, await chatBody(req));
        else if (path === "/api/chat/channels" && method === "GET")
          result = await service.channels(user.id);
        else if (path === "/api/chat/realtime-token" && method === "POST")
          result = await service.realtimeToken(user);
        else if (path === "/api/chat/presence" && method === "GET")
          result = await service.presence(
            user.id,
            url.searchParams.get("keys"),
          );
        else {
          const channel = path.match(
              /^\/api\/chat\/channels\/([a-z0-9-]+)\/(messages|read)$/,
            ),
            message = path.match(
              /^\/api\/chat\/messages\/([0-9a-f-]+)\/(delete|report)$/i,
            );
          if (channel && channel[2] === "messages" && method === "GET")
            result = await service.history(
              user.id,
              channel[1],
              url.searchParams.get("before") || "0",
            );
          else if (channel && channel[2] === "messages" && method === "POST") {
            result = await service.send(
              user.id,
              channel[1],
              await chatBody(req),
            );
            wake();
          } else if (channel && channel[2] === "read" && method === "POST")
            result = await service.markRead(
              user.id,
              channel[1],
              await chatBody(req),
            );
          else if (message && method === "POST")
            result =
              message[2] === "delete"
                ? await service.removeOwn(user.id, message[1])
                : await service.report(
                    user.id,
                    message[1],
                    await chatBody(req),
                  );
          else throw new ChatError(404, "Chat endpoint not found.");
        }
      }
      respond(res, 200, result, { "cache-control": "no-store" });
    } catch (error) {
      const status = error instanceof ChatError ? error.status : 500;
      respond(
        res,
        status,
        {
          error:
            status === 500
              ? "Chat could not complete this request. Please try again."
              : error.message,
        },
        {
          "cache-control": "no-store",
          ...(error.retryAfter
            ? { "retry-after": String(error.retryAfter) }
            : {}),
        },
      );
    }
    return true;
  };
}
import { createHash } from "node:crypto";
const createKeyId = (key) =>
  createHash("sha256").update(key).digest("hex").slice(0, 16);
