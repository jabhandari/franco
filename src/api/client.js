async function parseApiResponse(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
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
export function normalizeChoices(raw) {
  let choices = raw;
  if (typeof choices === 'string') {
    try { choices = JSON.parse(choices); } catch { return []; }
  }
  if (Array.isArray(choices)) {
    return choices
      .map((c) => ({ key: String(c.key ?? c.id ?? ''), text: String(c.text ?? '') }))
      .filter((c) => c.text);
  }
  if (choices && typeof choices === 'object') {
    return Object.entries(choices).map(([key, text]) => ({ key: String(key), text: String(text) }));
  }
  return [];
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
