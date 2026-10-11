// FRA-21 presenter: pure collection helpers. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText } from './format.presenter.ts';

/** A normalized multiple-choice option. */
export interface Choice {
  key: string;
  text: string;
}

/**
 * Unbiased shuffle (Fisher-Yates). Never use Array.sort(() => Math.random() - 0.5).
 * @returns a new shuffled array; the input is not mutated
 */
export function shuffle<T>(items: readonly T[]): T[] {
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
 */
export function normalizeChoices(raw: unknown): Choice[] {
  let choices: unknown = raw;
  if (typeof choices === 'string') {
    try { choices = JSON.parse(choices); } catch { return []; }
  }
  if (Array.isArray(choices)) {
    return (choices as unknown[])
      .map((c) => {
        const rec = c as { key?: unknown; id?: unknown; text?: unknown } | null;
        const keyRaw = rec && rec.key !== undefined ? rec.key : rec && rec.id;
        return { key: safeText(keyRaw), text: safeText(rec && rec.text) };
      })
      .filter((c) => c.text);
  }
  if (choices && typeof choices === 'object') {
    return Object.entries(choices as Record<string, unknown>)
      .map(([key, text]) => ({ key: safeText(key, key), text: safeText(text) }))
      .filter((c) => c.text);
  }
  return [];
}
