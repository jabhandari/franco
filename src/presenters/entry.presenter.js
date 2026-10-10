// FRA-21 presenter: pure entry sanitization. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText } from './format.presenter.js';
import { normalizeChoices } from './collections.presenter.js';

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

/**
 * @param {*} entry
 * @returns {object} sanitized entry ({} for non-objects)
 */
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
