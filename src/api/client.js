// Pure presenters live in src/presenters/ (FRA-21); this module re-exports
// them so every existing import from './api/client.js' keeps working.
// New code should import from the presenter modules directly.
export { safeText, formatEnum, getErrorMessage } from '../presenters/format.presenter.js';
export { shuffle, normalizeChoices } from '../presenters/collections.presenter.js';
export { sanitizeEntry } from '../presenters/entry.presenter.js';

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

// (moved to src/presenters/format.presenter.js — re-exported at the top of this file)

export async function apiGet(path, token, options = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;
  const response = await fetch(path, { headers, cache: 'no-store' });
  return parseApiResponse(response);
}

export async function apiPost(path, body, token, options = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;
  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return parseApiResponse(response);
}

// shuffle / normalizeChoices / sanitizeEntry moved to
// src/presenters/collections.presenter.js and src/presenters/entry.presenter.js — re-exported
// at the top of this file.

let speechStatusToken = null;
let speechStatusRequest = null;
export function getSpeechStatus(token) {
  if (speechStatusToken !== token) { speechStatusToken = token; speechStatusRequest = null; }
  speechStatusRequest ||= apiGet('/api/speech/status', token).catch((error) => { speechStatusRequest = null; throw error; });
  return speechStatusRequest;
}

export async function uploadSpeech(itemId, audio, token, practiceId = null) {
  const path = '/api/speech/transcribe?item_id=' + encodeURIComponent(itemId) + (practiceId ? '&practice=' + encodeURIComponent(practiceId) : '');
  const response = await fetch(path, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': audio.type },
    body: audio,
  });
  return parseApiResponse(response);
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
