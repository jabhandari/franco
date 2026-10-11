// FRA-21 presenter: pure entry sanitization. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText } from './format.presenter.ts';
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
export interface SanitizedEntry extends Record<string, unknown> {
  choices?: Choice[];
  rubric?: Record<string, string>;
  media?: Array<Record<string, unknown> & { url: string }>;
}

/**
 * @param entry raw exercise entry (or anything)
 * @returns sanitized entry ({} for non-objects)
 */
export function sanitizeEntry(entry: unknown): SanitizedEntry {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return {};
  const out: SanitizedEntry = { ...(entry as Record<string, unknown>) };
  for (const field of ENTRY_TEXT_FIELDS) {
    if (field in out) out[field] = safeText(out[field]);
  }
  for (const field of ENTRY_TEXT_LIST_FIELDS) {
    if (Array.isArray(out[field])) {
      out[field] = (out[field] as unknown[]).map((value) => safeText(value)).filter(Boolean);
    } else if (field in out) {
      out[field] = [];
    }
  }
  if ('choices' in out) out.choices = normalizeChoices(out.choices);
  if (out.rubric && typeof out.rubric === 'object' && !Array.isArray(out.rubric)) {
    out.rubric = Object.fromEntries(
      Object.entries(out.rubric as Record<string, unknown>).map(([key, value]) => [safeText(key, key), safeText(value)]),
    );
  } else if ('rubric' in out) {
    out.rubric = {};
  }
  if (Array.isArray(out.media)) {
    out.media = (out.media as unknown[])
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m) => ({ ...m, url: safeText(m.url) }));
  }
  return out;
}
