// FRA-21 presenter: pure entry sanitization. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText, isRecord, type JsonValue } from './format.presenter.ts';
import { normalizeChoices } from './collections.presenter.ts';
import type { Choice } from './collections.presenter.ts';

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

/** A sanitized exercise entry: text fields coerced to strings, lists scrubbed. */
export type SanitizedEntry = Record<string, JsonValue> & {
  choices?: Choice[];
  rubric?: Record<string, string>;
  media?: Array<Record<string, JsonValue> & { url: string }>;
};

/**
 * @param entry raw exercise entry (or anything)
 * @returns sanitized entry ({} for non-objects)
 */
export function sanitizeEntry(entry: JsonValue): SanitizedEntry {
  if (!isRecord(entry)) return {};
  const out: SanitizedEntry = { ...entry };
  for (const field of ENTRY_TEXT_FIELDS) {
    if (field in out) out[field] = safeText(out[field]);
  }
  for (const field of ENTRY_TEXT_LIST_FIELDS) {
    if (Array.isArray(out[field])) {
      const list: JsonValue[] = out[field];
      out[field] = list.map((value: JsonValue) => safeText(value)).filter(Boolean);
    } else if (field in out) {
      out[field] = [];
    }
  }
  if ('choices' in out) out.choices = normalizeChoices(out.choices);
  if (isRecord(out.rubric)) {
    out.rubric = Object.fromEntries(
      Object.entries(out.rubric).map(([key, value]) => [safeText(key, key), safeText(value)]),
    );
  } else if ('rubric' in out) {
    out.rubric = {};
  }
  if (Array.isArray(out.media)) {
    const list: JsonValue[] = out.media;
    out.media = list
      .filter((m: JsonValue): m is Record<string, JsonValue> => m !== null && typeof m === 'object')
      .map((m) => ({ ...m, url: safeText(m.url) }));
  }
  return out;
}
