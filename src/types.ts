/** Public auth screen modes shared by routing and the auth view. */
export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify' | 'check-email' | 'unverified';

// Shared TypeScript types for the franco SPA — the single home for
// cross-cutting domain types. Import from here instead of redefining a
// shape locally; a type used by only one module lives in that module.
// Mirrors the server contract in `server/content-contract.js`
// (CONTENT_TYPES, CEFR_LEVELS, EVALUATORS) — if the server changes those,
// update here too.
//
// Clean-code rules (enforced in code review):
// - Prefer `type` over `interface`; avoid `interface`.
// - No `as` assertions. Ever, unless explicitly justified with a comment
//   at the usage site explaining why proper typing is impossible.
// - Never `any` or `unknown` — not as annotations, generic defaults, or
//   index-signature values. Investigate the server response and call sites
//   and define the real type instead.

/** CEFR levels, ascending. Matches `CEFR_LEVELS` in server/content-contract.js. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type SkillId = 'ecouter' | 'lire' | 'ecrire' | 'parler';
export type LessonSection = 'overview' | 'theory' | 'vocabulary' | 'examples';
export type LessonPosition = {
  slug: string;
  title: string;
  level_code: CefrLevel;
  position: number;
  total: number;
  section: LessonSection;
  updated_at: string;
};

export type ConceptProgress = {
  concept_id: string;
  slug: string;
  title: string;
  level_code: CefrLevel | null;
  mastery: number;
  total_attempts: number;
  last_practiced_at: string | null;
  state: 'not_started' | 'in_progress' | 'completed';
};

export type SkillProgress = {
  skill: SkillId;
  level: CefrLevel;
  exercises_total: number;
  exercises_done: number;
  exercises_correct: number;
  percent: number;
};

/** Content item types. Matches `CONTENT_TYPES` in server/content-contract.js. */
export type ContentItemType =
  | 'multiple_choice'
  | 'cloze'
  | 'free_text'
  | 'word_order'
  | 'reading'
  | 'listening'
  | 'speaking'
  | 'vocabulary';

/** Grading modes. Matches `EVALUATORS` in server/content-contract.js. */
export type EvaluationMode =
  | 'exact'
  | 'choice'
  | 'normalized_text'
  | 'token_order'
  | 'rubric'
  | 'external';

/** Lifecycle status of a content item in the content bank. */
export type ContentItemStatus = 'pending_review' | 'approved' | 'published' | 'rejected';

/** Public user shape returned by signup/login, /api/me, and /api/me/profile. */
export type UserPayload = {
  id: string;
  email: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
};

/** POST /api/auth/signup and POST /api/auth/login. */
export type AuthResponse = {
  token: string;
  user: UserPayload;
};

/** Shape of `{ error: string }` failure responses across the API. */
export type ApiError = {
  error: string;
};

/** CEFR metadata block on content items. */
export type CefrMeta = {
  level: CefrLevel;
  method: 'source' | 'human_review' | 'heuristic' | 'model' | 'mixed';
  confidence?: number | null;
};

/** Minimal content-item shape shared by the review queue and exercises. */
export type ContentItemSummary = {
  id: string;
  external_id: string;
  item_type: ContentItemType;
  status: ContentItemStatus;
  cefr_level: CefrLevel;
  prompt: string;
};

export type TranslationResult = { text:string;translation:string;source:'fr'|'en';target:'fr'|'en' };
export type DiaryEntry = TranslationResult & { id:string;saved_at:string };
