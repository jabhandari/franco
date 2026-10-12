// FRA-21 presenter: pure collection helpers. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText, isRecord, type JsonValue } from './format.presenter.ts';
import type { ContentItemChoice } from '../api/client.js';

/** A normalized multiple-choice option. */
export type Choice = {
  key: string;
  text: string;
};

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
 * Raw choices as they arrive from the API: normalized [{key,text}], a JSON
 * string, or an {A: "..."} map (legacy shapes).
 *
 * Id-bearing [{id,text}] pairs are NOT part of this legacy input contract:
 * they arrive verbatim from response_json (see ContentItemChoice in
 * src/api/client.ts) and callers pass them through the widened
 * normalizeChoices() input below.
 */
export type RawChoices = Choice[] | string | Record<string, string>;

/**
 * Choices may arrive as [{key,text}], a JSON string, an {A: "..."} map, or
 * the verbatim response_json pairs [{id,text}] / [{key,text}]
 * (ContentItemChoice — shapeContentItem() in server/index.js forwards
 * response_json.choices without normalizing, and the attempts route reads
 * choice.id off those payloads).
 * Object-shaped values collapse to '' rather than "[object Object]".
 */
export function normalizeChoices(raw: RawChoices | ContentItemChoice[] | null | undefined): Choice[] {
  if (raw == null) return [];
  let choices: JsonValue = raw;
  if (typeof choices === 'string') {
    try { choices = JSON.parse(choices); } catch { return []; }
  }
  if (Array.isArray(choices)) {
    const list: JsonValue[] = choices;
    return list
      .map((c: JsonValue) => {
        const rec: Record<string, JsonValue> | null = isRecord(c) ? c : null;
        const keyRaw = rec && rec.key !== undefined ? rec.key : rec && rec.id;
        return { key: safeText(keyRaw), text: safeText(rec && rec.text) };
      })
      .filter((c) => c.text);
  }
  if (isRecord(choices)) {
    return Object.entries(choices)
      .map(([key, text]) => ({ key: safeText(key, key), text: safeText(text) }))
      .filter((c) => c.text);
  }
  return [];
}
