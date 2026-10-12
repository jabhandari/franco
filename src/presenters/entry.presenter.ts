// FRA-21 presenter: pure entry sanitization. No JSX, no hooks, no side
// effects. Moved verbatim from src/api/client.js (re-exported there for
// compatibility).
import { safeText, isRecord } from './format.presenter.ts';
import { normalizeChoices, type Choice, type RawChoices } from './collections.presenter.ts';

/** One media attachment on an entry (media_assets). */
export type EntryMedia = {
  kind: string;
  url: string;
  duration_seconds?: number | null;
  transcript?: string | null;
};

/**
 * Exercise entry from the API (GET /api/me/session, /api/content, etc.).
 * Field shapes come from the server's shapeContentItem plus the legacy
 * exam/exercise tracks. The sanitizer normalizes these in place.
 */
export type ExerciseEntry = {
  id?: string;
  external_id?: string;
  item_kind?: string;
  type?: string;
  level?: string;
  title?: string;
  prompt?: string;
  instructions?: string;
  context?: string;
  explanation?: string;
  text?: string;
  skill?: string;
  transcript?: string;
  passage?: string;
  hint?: string;
  reveal?: string;
  expected?: string;
  evaluation_mode?: string | null;
  choices?: Choice[] | RawChoices;
  tokens?: string[];
  distractors?: string[];
  rubric?: Record<string, string>;
  expectedPoints?: string[];
  expected_points?: string[];
  followUpQuestions?: string[];
  follow_up_questions?: string[];
  media?: EntryMedia[];
};

// Sanitize one exercise entry at the render boundary so no renderer can
// crash (or print raw JSON) on object-shaped API fields.
const ENTRY_TEXT_FIELDS = [
  'prompt', 'context', 'explanation', 'instructions', 'text', 'title',
  'level', 'skill', 'type', 'transcript', 'passage', 'hint', 'reveal',
] as const;
// FRA-66 fix: expectedPoints/expected_points are string lists (SpeakingPrompt
// renders them with .map). They were in ENTRY_TEXT_FIELDS, where safeText
// coerced arrays to '' and the "Ideas to include" section never rendered.
const ENTRY_TEXT_LIST_FIELDS = [
  'followUpQuestions', 'follow_up_questions', 'tokens', 'distractors',
  'expectedPoints', 'expected_points',
] as const;

/** Raw exercise entry from the API (before sanitization): choices not yet normalized. */
export type RawExerciseEntry = Omit<ExerciseEntry, 'choices'> & {
  choices?: RawChoices;
};

/** A sanitized exercise entry: text fields coerced to strings, lists scrubbed. */
export type SanitizedEntry = ExerciseEntry & {
  choices?: Choice[];
};

/**
 * @param entry raw exercise entry (or anything)
 * @returns sanitized entry ({} for non-objects)
 */
export function sanitizeEntry(entry: RawExerciseEntry | null | undefined): SanitizedEntry {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return {};
  const out: SanitizedEntry = { ...entry, choices: undefined };
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
  if ('choices' in entry) out.choices = normalizeChoices(entry.choices);
  if (isRecord(out.rubric)) {
    out.rubric = Object.fromEntries(
      Object.entries(out.rubric).map(([key, value]) => [safeText(key, key), safeText(value)]),
    );
  } else if ('rubric' in out) {
    out.rubric = {};
  }
  if (Array.isArray(out.media)) {
    out.media = out.media
      .filter((m): m is EntryMedia => m !== null && typeof m === 'object')
      .map((m) => ({ ...m, url: safeText(m.url) }));
  }
  return out;
}
