export const GUIDELINES_VERSION = "2026-10-15";
export const GUIDELINES = [
  "Parle français autant que possible — speak French as much as you can. English is fine when you are asking about French.",
  "Be kind. No harassment, insults, hate speech, or threats.",
  "No spam, advertising, or flooding the channel.",
  "Do not share personal information — yours or anyone else’s (email, phone, address, social handles).",
  "Keep it appropriate: no sexual or graphic content.",
  "Links must be about French learning.",
  "Moderators may remove messages, mute, or ban. Messages are kept for 4 weeks and may be reviewed by moderators.",
];
export const CHAT_CHANNELS = [
  "general",
  "debutants-a1-a2",
  "intermediaire-b1-b2",
  "avances-c1-c2",
  "questions-aide",
];
export const REPORT_REASONS = [
  "harassment",
  "hate",
  "spam",
  "personal_information",
  "sexual_or_graphic",
  "unsafe_link",
  "other",
];
export class ChatError extends Error {
  constructor(status, message, retryAfter = 0) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export function chatConfig(env = process.env) {
  return {
    enabled: env.CHAT_ENABLED === "true",
    guidelinesApproved: env.CHAT_GUIDELINES_APPROVED === "true",
    url: env.SUPABASE_URL || "",
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || "",
    jwtSecret: env.SUPABASE_JWT_SECRET || "",
    privateRealtime: env.CHAT_PRIVATE_REALTIME_CONFIRMED === "true",
    moderationKey: env.OPENAI_MODERATION_API_KEY || "",
    moderatorKey: env.CHAT_MODERATOR_API_KEY || "",
    jobKey: env.CHAT_JOB_API_KEY || "",
  };
}
export function validatePseudonym(value, user) {
  const name = typeof value === "string" ? value.normalize("NFKC").trim() : "";
  const normalize = (s) =>
    String(s || "")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(name))
    throw new ChatError(
      400,
      "Choose a chat name of 3–24 letters, numbers, underscores or hyphens.",
    );
  const normalized = normalize(name);
  const real = [
    user.name,
    user.first_name,
    user.last_name,
    user.email?.split("@")[0],
  ]
    .map(normalize)
    .filter((s) => s.length >= 3);
  if (real.some((s) => normalized === s || normalized.includes(s)))
    throw new ChatError(
      400,
      "Choose a pseudonym different from your account name.",
    );
  if (/admin|moderator|moderateur|francoofficial/i.test(normalized))
    throw new ChatError(
      400,
      "Choose a name that does not impersonate a moderator.",
    );
  return name;
}
const BLOCKED = [
  /\b(?:fuck\s+you|kill\s+yourself|go\s+kill\s+yourself)\b/i,
  /\b(?:va\s+te\s+faire\s+foutre|suicide[- ]toi|sale\s+con(?:ne)?)\b/i,
];
const ALLOWED_LINKS = new Set([
  "apprendre.tv5monde.com",
  "www.lawlessfrench.com",
  "lawlessfrench.com",
  "fr.wiktionary.org",
  "www.rfi.fr",
  "francaisfacile.rfi.fr",
  "www.france-education-international.fr",
]);
export function validateChatMessage(input, isNewAccount) {
  const body =
    typeof input?.body === "string" ? input.body.normalize("NFKC").trim() : "";
  if (
    !body ||
    body.length > 1500 ||
    /[\u0000-\u0008\u000b-\u001f\u007f]/.test(body)
  )
    throw new ChatError(400, "Write a text message of 1–1500 characters.");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.client_msg_id || "",
    )
  )
    throw new ChatError(400, "A valid client message ID is required.");
  const plain = body.normalize("NFKD").replace(/\p{M}/gu, "");
  if (BLOCKED.some((re) => re.test(plain)))
    throw new ChatError(
      422,
      "This message breaks the community guidelines. Please rephrase it.",
    );
  if (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(body) ||
    /(?:\+\d[\d ().-]{7,}\d)|(?:\b\d{3}[- .]\d{3}[- .]\d{4}\b)/.test(body) ||
    /(?:^|\s)@[\w.]{3,}/.test(body)
  )
    throw new ChatError(
      422,
      "Keep email addresses, phone numbers and social handles out of chat.",
    );
  const links =
    body.match(
      /(?:https?:\/\/|www\.)[^\s<>]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|fr|edu|co|app|dev|xyz)(?:\/[^\s<>]*)?/gi,
    ) || [];
  if (
    isNewAccount &&
    (links.length || /\b[\w-]+\.(?:com|net|org|io|fr)\b/i.test(body))
  )
    throw new ChatError(422, "New accounts cannot post links yet.");
  for (const link of links) {
    let url;
    try {
      url = new URL(/^https?:\/\//i.test(link) ? link : "https://" + link);
    } catch {
      throw new ChatError(422, "Use a valid French-learning link.");
    }
    if (url.protocol !== "https:" || !ALLOWED_LINKS.has(url.hostname))
      throw new ChatError(
        422,
        "Only approved French-learning reference links are allowed.",
      );
  }
  if (/(?:javascript:|data:|ftp:)/i.test(body))
    throw new ChatError(
      422,
      "Only approved French-learning reference links are allowed.",
    );
  const words = plain.toLowerCase().match(/[a-z]+/g) || [];
  const english = words.filter((w) =>
    [
      "the",
      "this",
      "that",
      "with",
      "hello",
      "what",
      "where",
      "thanks",
      "your",
      "you",
      "are",
    ].includes(w),
  ).length;
  const french = words.filter((w) =>
    [
      "le",
      "la",
      "les",
      "je",
      "tu",
      "vous",
      "nous",
      "bonjour",
      "merci",
      "avec",
      "une",
      "des",
      "est",
      "pour",
      "francais",
    ].includes(w),
  ).length;
  return {
    body,
    clientMsgId: input.client_msg_id,
    frenchNudge: english >= 2 && english > french,
  };
}
