function fallbackForStatus(status) {
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return 'You do not have access to that.';
  if (status === 404) return 'That was not found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again.';
  return 'Request failed. Please try again.';
}

async function parseApiResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The server sent an unreadable response. Please try again.');
  }
  if (!response.ok) {
    const message = safeText(payload && payload.error) || safeText(payload && payload.message);
    throw new Error(message || fallbackForStatus(response.status));
  }
  return payload;
}

// Render unknown API values safely. Learners never see raw JSON or
// "[object Object]": objects, arrays, and booleans collapse to the fallback.
export function safeText(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

// "not_started" -> "Not Started". Never throws on non-string input.
export function formatEnum(value) {
  const text = safeText(value).trim();
  if (!text) return '';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Normalize any caught error into a concise learner-facing message.
export function getErrorMessage(error) {
  const message = error && safeText(error.message).trim();
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

export async function apiGet(path, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const response = await fetch(path, { headers, cache: 'no-store' });
  return parseApiResponse(response);
}

export async function apiPost(path, body, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return parseApiResponse(response);
}

// Unbiased shuffle (Fisher-Yates). Never use Array.sort(() => Math.random() - 0.5).
export function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Choices may arrive as [{key,text}], a JSON string, or an {A: "..."} map.
// Object-shaped values collapse to '' rather than "[object Object]".
export function normalizeChoices(raw) {
  let choices = raw;
  if (typeof choices === 'string') {
    try { choices = JSON.parse(choices); } catch { return []; }
  }
  if (Array.isArray(choices)) {
    return choices
      .map((c) => ({ key: safeText(c && c.key !== undefined ? c.key : c && c.id), text: safeText(c && c.text) }))
      .filter((c) => c.text);
  }
  if (choices && typeof choices === 'object') {
    return Object.entries(choices).map(([key, text]) => ({ key: safeText(key, key), text: safeText(text) })).filter((c) => c.text);
  }
  return [];
}

// Sanitize one exercise entry at the render boundary so no renderer can
// crash (or print raw JSON) on object-shaped API fields.
const ENTRY_TEXT_FIELDS = [
  'prompt', 'context', 'explanation', 'instructions', 'text', 'title',
  'level', 'skill', 'type', 'transcript', 'passage', 'hint', 'reveal',
  'expectedPoints', 'expected_points',
];
const ENTRY_TEXT_LIST_FIELDS = [
  'followUpQuestions', 'follow_up_questions', 'tokens', 'distractors',
];

export function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return {};
  const out = { ...entry };
  for (const field of ENTRY_TEXT_FIELDS) {
    if (field in out) out[field] = safeText(out[field]);
  }
  for (const field of ENTRY_TEXT_LIST_FIELDS) {
    if (Array.isArray(out[field])) {
      out[field] = out[field].map((value) => safeText(value)).filter(Boolean);
    } else if (field in out) {
      out[field] = [];
    }
  }
  if ('choices' in out) out.choices = normalizeChoices(out.choices);
  if (out.rubric && typeof out.rubric === 'object' && !Array.isArray(out.rubric)) {
    out.rubric = Object.fromEntries(
      Object.entries(out.rubric).map(([key, value]) => [safeText(key, key), safeText(value)]),
    );
  } else if ('rubric' in out) {
    out.rubric = {};
  }
  if (Array.isArray(out.media)) {
    out.media = out.media
      .filter((m) => m && typeof m === 'object')
      .map((m) => ({ ...m, url: safeText(m.url) }));
  }
  return out;
}

// Report an answered exercise to the adaptive engine. Every renderer calls
// this; the server grades, updates SM-2 state, and returns { correct, reveal }.
export function reportAttempt(entry, response, token, extra = {}) {
  const payload = {
    item_kind: entry.item_kind,
    response,
    duration_ms: extra.durationMs ?? null,
    hint_used: Boolean(extra.hintUsed),
    session_id: extra.sessionId ?? null,
  };
  if (entry.item_kind === 'content_item') payload.item_id = entry.id;
  else payload.legacy_ref = entry.id;
  return apiPost('/api/me/attempts', payload, token);
}
