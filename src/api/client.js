// Pure presenters live in src/presenters/ (FRA-21); this module re-exports
// them so every existing import from './api/client.js' keeps working.
// New code should import from the presenter modules directly.
export { safeText, formatEnum, getErrorMessage } from '../presenters/format.js';
export { shuffle, normalizeChoices } from '../presenters/collections.js';
export { sanitizeEntry } from '../presenters/entry.js';

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

// (moved to src/presenters/format.js — re-exported at the top of this file)

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

// shuffle / normalizeChoices / sanitizeEntry moved to
// src/presenters/collections.js and src/presenters/entry.js — re-exported
// at the top of this file.

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
