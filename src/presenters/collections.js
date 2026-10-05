// FRA-21 presenter: pure collection helpers. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText } from './format.js';

/**
 * Unbiased shuffle (Fisher-Yates). Never use Array.sort(() => Math.random() - 0.5).
 * @param {Array} items
 * @returns {Array} a new shuffled array; the input is not mutated
 */
export function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Choices may arrive as [{key,text}], a JSON string, or an {A: "..."} map.
 * Object-shaped values collapse to '' rather than "[object Object]".
 * @param {*} raw
 * @returns {Array<{key: string, text: string}>}
 */
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
