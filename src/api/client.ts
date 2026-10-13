// Canonical API boundary types for the franco backend (server/index.js).
// FRA-61 owns these: every view consumes the API through the helpers at the
// bottom of this file. Other wave-2 tickets may define local copies of these
// shapes — FRA-68 unifies them at closeout.
// Shared domain shapes (UserPayload, ContentItemStatus, EvaluationMode,
// ContentItemType, CefrMeta) are imported from '../types' and never redefined
// here — src/types.ts is read-only during wave 2.
// Pure presenters live in src/presenters/ (FRA-21); this module re-exports
// them so every existing import from './api/client.js' keeps working.
// New code should import from the presenter modules directly.
export { safeText, formatEnum, getErrorMessage } from '../presenters/format.presenter.js';
export { shuffle, normalizeChoices } from '../presenters/collections.presenter.js';
export { sanitizeEntry } from '../presenters/entry.presenter.js';
// FRA-61: safeText was re-exported above but never imported, so the error
// branch of parseApiResponse referenced an unbound name (a latent
// ReferenceError on every failed request). TS requires the local binding;
// this import is the only intentional runtime change in this file.
import { safeText } from '../presenters/format.presenter.js';
import { browserTimeZone } from '../presenters/streak.presenter.js';
import type { LessonPosition, LessonSection } from '../types';
import type { UserPayload, ContentItemStatus, EvaluationMode, ContentItemType, CefrMeta, ConceptProgress, SkillProgress } from '../types';

// ---------------------------------------------------------------------------
// JSON wire types
// ---------------------------------------------------------------------------

/** Any JSON-serializable value: the wire type for the generic apiPost request
 *  body. Recursive, never unknown. Endpoint-specific request shapes (e.g.
 *  AttemptRequest) are defined per API below — this is only the transport. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** A JSON object (as opposed to any JSON value). Used only for the generic
 *  transport (apiPost body) and error-payload narrowing — never for domain
 *  fields, which define their own specific types. */
export type JsonObject = { [key: string]: JsonValue };

/** Free-form metadata blob on content items/revisions (flat scalar map). */
export type ContentMetadata = Record<string, string | number | boolean | null>;

/** One validation failure from validateBatch() (server/content-contract.js):
 *  `issue(path, message)` returns exactly `{ path, message }`. */
export type ValidationIssue = {
  path: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

/** Standard error payload returned by every API route on failure. */
export type ApiErrorBody = {
  error?: string;
  message?: string;
  code?: string;
};

/** Per-request options: a scoped content API key (x-api-key), never a URL. */
export type ApiRequestOptions = {
  apiKey?: string | null;
};

/** GET /api/health */
export type HealthResponse = {
  ok: boolean;
  database: string;
};

// ---------------------------------------------------------------------------
// Auth (/api/auth/*, /api/me)
// ---------------------------------------------------------------------------

/** Learner profile row (learner_profiles, SELECT *). Timestamps arrive as
 *  ISO strings after JSON serialization. */
export type LearnerProfile = {
  user_id: string;
  current_level: string | null;
  learning_goal: string | null;
  placement_status: string;
  created_at: string;
  updated_at: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type AuthRequest = LoginRequest | SignupRequest;

/** POST /api/auth/signup and POST /api/auth/login. The progress/mistakes/
 *  attempts arrays are always empty — the server hardcodes `[]` on these
 *  routes (legacy compatibility fields); real learner data comes from
 *  /api/me/progress. */
export type AuthResponse = {
  token: string;
  user: UserPayload;
  profile: null;
  progress: never[];
  mistakes: never[];
  attempts: never[];
};

/** GET /api/me. */
export type MeResponse = {
  user: UserPayload;
  profile: LearnerProfile | null;
  progress: ConceptProgress[];
  mistakes: RecentMistake[];
  attempts: LearningAttempt[];
  skill_progress: SkillProgress[];
};

export type RecentMistake = LearningAttempt & { prompt: string | null; level: string | null };
export type LessonPositionResponse = { lesson: LessonPosition | null };

export type UpdateProfileRequest = {
  first_name: string;
  last_name: string;
};

/** POST /api/me/profile (FRA-56). */
export type UpdateProfileResponse = {
  user: UserPayload;
};

export type PlacementRequest = {
  level: string;
};

/** POST /api/me/placement. */
export type PlacementResponse = {
  level: string;
  placement_status: 'complete';
};

export type StreakDay = {
  date: string;
  attempts: number;
};

/** GET /api/me/streak. */
export type StreakResponse = {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  activeDays: number;
  totalAttempts: number;
  today: string;
  days: StreakDay[];
};

// ---------------------------------------------------------------------------
// Content items and the session queue
// ---------------------------------------------------------------------------

export type ContentQueueKind = 'review' | 'new' | 'weak' | 'exam' | 'drill';

/** The kind of target an attempt grades: a content-bank item or a legacy row. */
export type AttemptItemKind = 'content_item' | 'exam_question' | 'exercise';

/** A media_assets row attached to a queue entry. kind is free text in the
 *  DB (the ingest schema restricts authored media to audio/image/video/
 *  document, but stored rows are not re-validated). */
export type ContentMediaAsset = {
  kind: string;
  url: string;
  duration_seconds: number | null;
  transcript: string | null;
};

/** A choice as stored in response_json ({id, text} per the ingest schema) or
 *  as normalized for renderers ({key, text} via normalizeChoices()). */
export type ContentItemChoice = { id: string; text: string } | { key: string; text: string };

/** Stored response_json of a content revision
 *  (schemas/content.v1.schema.json $defs.response). */
export type ContentResponseJson = {
  choices?: Array<{ id: string; text: string }>;
  answer?: string;
  accepted_answers?: string[];
  tokens?: string[];
  expected?: string;
};

/** Stored evaluation_json of a content revision. `mode` is required by the
 *  ingest schema; the rubric/points/questions/expected extras are read
 *  defensively by shapeContentItem() and evaluate() (server/index.js,
 *  server/evaluate.js). Rubric is a prose string per the schema but arrives
 *  as a criterion->description map in the seeded dataset. */
export type ContentEvaluationJson = {
  mode?: EvaluationMode;
  rubric?: string | Record<string, string>;
  case_sensitive?: boolean;
  expected_points?: string[];
  follow_up_questions?: string[];
  expected?: string;
  answer?: string;
  /** Legacy dataset label mapped onto evaluators by evaluate(). */
  scoring?: string;
};

/** A queue entry as shaped by shapeContentItem()/buildSessionPlan(): the unit
 *  every exercise renderer consumes. Optional fields are only present for the
 *  item types that produce them. */
export type ContentItemEntry = {
  id: string;
  external_id?: string;
  queue_kind: ContentQueueKind | null;
  item_kind: AttemptItemKind;
  level: string;
  type: string;
  title?: string | null;
  prompt?: string | null;
  instructions?: string | null;
  context?: string | null;
  skill?: string | null;
  media: ContentMediaAsset[];
  evaluation_mode: EvaluationMode | null;
  choices?: ContentItemChoice[];
  tokens?: string[];
  rubric?: string | Record<string, string>;
  expected_points?: string[];
  follow_up_questions?: string[];
  expected?: string;
};

/** GET /api/me/session-plan (and /api/me/session-plan/:level). */
export type SessionPlanResponse = {
  section: string;
  reviewsDue: number;
  queue: ContentItemEntry[];
  estimatedMinutes: number;
  message: string;
};

/** One learner_item_state row (SM-2 scheduling state per item). */
export type LearnerItemState = {
  user_id: string;
  item_id: string;
  due_at: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  lapses: number;
  last_result: string | null;
  last_attempt_at: string | null;
};

/** One learner_concept_mastery row (per-concept mastery tracking). */
export type LearnerConceptMastery = {
  user_id: string;
  concept_id: string;
  mastery: number;
  confidence: number;
  evidence_count: number;
  model_version: string;
  updated_at: string;
  total_attempts: number;
  correct_attempts: number;
  consecutive_correct: number;
  consecutive_incorrect: number;
  last_practiced_at: string | null;
  last_correct_at: string | null;
  last_incorrect_at: string | null;
};

/** GET /api/me/progress. */
export type ProgressResponse = {
  items: LearnerItemState[];
  concepts: LearnerConceptMastery[];
  attempts: LearningAttempt[];
};

/** One content_items row (SELECT i.*). */
export type ContentItemRow = {
  id: string;
  source_id: string;
  external_id: string;
  item_type: string;
  status: string;
  cefr_level: string;
  cefr_method: string;
  cefr_confidence: number | null;
  difficulty_band: string | null;
  difficulty_score: number | null;
  exact_hash: string;
  duplicate_group_id: string | null;
  current_revision: number;
  created_at: string;
  updated_at: string;
};

/** Raw review-due row: SELECT i.*, r.prompt, r.response_json,
 *  r.evaluation_json, s.due_at (GET /api/me/review-due). */
export type ReviewDueItem = ContentItemRow & {
  prompt: string;
  response_json: ContentResponseJson;
  evaluation_json: ContentEvaluationJson;
  due_at: string;
};

/** GET /api/me/review-due. */
export type ReviewDueResponse = {
  items: ReviewDueItem[];
};

// ---------------------------------------------------------------------------
// Attempts (/api/me/attempts)
// ---------------------------------------------------------------------------

/** The entry object every exercise renderer hands to reportAttempt. */
export type ReportAttemptEntry = {
  id: string;
  item_kind: AttemptItemKind;
};

export type ReportAttemptExtra = {
  durationMs?: number | null;
  hintUsed?: boolean;
  sessionId?: string | null;
};

/** The learner's answer payload. Renderers pass: the chosen choice key or
 *  typed text (string), the ordered tokens (string[]), or the
 *  speaking-completion object for speaking items. */
export type AttemptResponse = string | string[] | SpeakingCompletion;

/** POST /api/me/attempts request body. */
export type AttemptRequest = {
  item_kind: AttemptItemKind;
  response: AttemptResponse;
  duration_ms: number | null;
  hint_used: boolean;
  session_id: string | null;
  timezone: string;
  item_id?: string;
  legacy_ref?: string;
};

/** The evaluation_json stored on a learning_attempts row: the grading
 *  outcome plus which evaluator produced it. */
export type AttemptEvaluationJson = {
  correct: boolean;
  evaluator: string;
};

/** One learning_attempts row (RETURNING *). item_kind/legacy_ref arrive via
 *  the migrate() ALTERs in server/database.js; item_id is nullable for
 *  legacy attempts (also per migrate()). */
export type LearningAttempt = {
  id: string;
  user_id: string;
  item_id: string | null;
  item_kind: AttemptItemKind;
  legacy_ref: string | null;
  revision: number;
  response_json: AttemptResponse;
  evaluation_json: AttemptEvaluationJson;
  score: number | null;
  duration_ms: number | null;
  created_at: string;
  correct: boolean | null;
  attempt_number: number | null;
  session_id: string | null;
  hint_used: boolean;
};

/** POST /api/me/attempts response. `attempt` is the inserted learning_attempts
 *  row (RETURNING *); `reveal` is the expected answer, computed after
 *  grading — for multiple-choice it is the correct choice's text, never just
 *  its key (FRA-7). */
export type AttemptResult = {
  attempt: LearningAttempt;
  correct: boolean;
  score: number | null;
  reveal: string | null;
  next_due_at: string | null;
};

// ---------------------------------------------------------------------------
// Content v1 (scoped x-api-key) and review actions
// ---------------------------------------------------------------------------

export type ReviewAction = 'approve' | 'reject' | 'publish';

/** Queue row: a shaped item plus review metadata (GET /api/content/v1/items). */
export type ContentReviewQueueItem = ContentItemEntry & {
  status: ContentItemStatus;
  external_id: string;
  source: string | null;
  batch_id: string | null;
  report_count: number;
};

/** GET /api/content/v1/items. */
export type ContentItemsResponse = {
  total: number;
  items: ContentReviewQueueItem[];
};

/** Raw single-item row: SELECT i.*, r.revision, r.title, r.prompt,
 *  r.instructions, r.context, r.response_json, r.evaluation_json,
 *  r.metadata_json (GET /api/content/v1/items/:id). */
export type ContentItemDetail = ContentItemRow & {
  revision: number;
  title: string | null;
  prompt: string;
  instructions: string | null;
  context: string | null;
  response_json: ContentResponseJson;
  evaluation_json: ContentEvaluationJson;
  metadata_json: ContentMetadata;
};

export type ReviewActionRequest = {
  note?: string;
};

/** POST /api/content/v1/items/:id/{approve,reject,publish}. */
export type ReviewActionResponse = {
  id: string;
  status: ContentItemStatus;
};

export type ReportContentRequest = {
  reason: string;
  note?: string | null;
};

/** POST /api/content/v1/items/:id/report (learner Bearer <redacted>). */
export type ReportContentResponse = {
  reported: boolean;
  reports: number;
  demoted: boolean;
};

/** GET /api/content/v1/item-counts?level=<CEFR>. */
export type ContentItemCountsForLevel = {
  level: string;
  total: number;
  byType: Record<string, number>;
};

/** GET /api/content/v1/item-counts (no level). */
export type ContentItemCountsAll = {
  counts: Record<string, { total: number; byType: Record<string, number> }>;
};

export type ContentItemCountsResponse = ContentItemCountsForLevel | ContentItemCountsAll;

export type BatchSource = {
  id: string;
  name: string;
  url?: string | null;
  license?: string | null;
  attribution?: string | null;
};

/** One authored media reference in a batch item
 *  (schemas/content.v1.schema.json $defs.item.properties.media). */
export type BatchIngestMedia = {
  kind: 'audio' | 'image' | 'video' | 'document';
  url: string;
  duration_seconds?: number;
  transcript?: string;
  checksum?: string;
};

/** One item in a batch ingest payload, per schemas/content.v1.schema.json
 *  $defs.item. The cefr block reuses the shared CefrMeta shape. */
export type BatchIngestItem = {
  external_id: string;
  type: ContentItemType;
  title?: string;
  prompt: string;
  instructions?: string;
  context?: string;
  cefr: CefrMeta & { evidence?: string };
  difficulty?: {
    band?: 'introductory' | 'basic' | 'intermediate' | 'advanced' | 'proficient';
    score?: number;
    method?: string;
  };
  response: ContentResponseJson;
  evaluation: ContentEvaluationJson;
  concepts?: string[];
  tags?: string[];
  media?: BatchIngestMedia[];
  metadata?: ContentMetadata;
};

/** POST /api/content/v1/batches request body (validated against
 *  schemas/content.v1.schema.json server-side). */
export type BatchIngestRequest = {
  schema_version?: string;
  batch_id: string;
  idempotency_key: string;
  source: BatchSource;
  items: BatchIngestItem[];
  auto_publish?: boolean;
};

export type BatchCreatedItem = {
  external_id: string;
  item_id: string;
  status: ContentItemStatus;
};

export type BatchDuplicateItem = {
  external_id: string;
  item_id: string;
  candidate_item_id?: string;
  kind: 'exact' | 'near';
  similarity?: number;
};

/** POST /api/content/v1/batches response (202 on ingest, 200 on idempotent
 *  replay, 422 on validation failure). validation_errors mirrors the
 *  content_batches.validation_errors column (jsonb, default '[]'). */
export type BatchIngestResponse = {
  batch_id?: string;
  status?: ContentItemStatus;
  item_count?: number;
  validation_errors?: ValidationIssue[];
  idempotent_replay?: boolean;
  schema_version?: string;
  created?: BatchCreatedItem[];
  duplicates?: BatchDuplicateItem[];
  error?: string;
};

/** GET /api/content/v1/batches/:id. */
export type BatchItemSummary = {
  id: string;
  external_id: string;
  item_type: string;
  status: ContentItemStatus;
  cefr_level: string;
};

export type ContentBatchDetail = {
  id: string;
  source_id: string;
  idempotency_key: string;
  schema_version: string;
  status: string;
  item_count: number;
  validation_errors: ValidationIssue[];
  created_at: string;
  completed_at: string | null;
  items: BatchItemSummary[];
};

/** The metadata_json seeded per concept (scripts/seed-concepts.mjs): theory
 *  and examples are [label, text, ...] / [french, english] string pairs. */
export type ConceptMetadata = {
  theory: string[][];
  vocabulary: string[];
  examples: string[][];
  sources: string[][];
  stub: boolean;
};

export type ContentConcept = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  concept_type: string;
  level_code: string | null;
  parent_id: string | null;
  status: string;
  metadata: ConceptMetadata;
  prerequisites: string[];
};

/** GET /api/content/v1/concepts. */
export type ContentConceptsResponse = {
  concepts: ContentConcept[];
};

// ---------------------------------------------------------------------------
// Speech (/api/speech/*)
// ---------------------------------------------------------------------------

/** GET /api/speech/status. */
export type SpeechStatusResponse = {
  available: boolean;
  max_seconds: number;
};

export type SpeechQuota = {
  user_requests_remaining_today: number;
  user_audio_seconds_remaining_today: number;
  resets_at: string;
};

export type SpeechFeedbackToken = {
  text: string;
  status: 'matched' | 'missed' | 'extra';
};

/** Word-alignment feedback from speechFeedback() (shared/speech-feedback.js):
 *  transcript_only when there is no expected phrase, otherwise the
 *  expected/heard token diffs. */
export type SpeechFeedback =
  | { mode: 'transcript_only' }
  | { mode: 'word_diff'; expected: SpeechFeedbackToken[]; heard: SpeechFeedbackToken[] };

/** POST /api/speech/transcribe response. */
export type SpeechTranscribeResponse = {
  transcription_id: string;
  transcript: string;
  duration_seconds: number;
  feedback: SpeechFeedback;
  quota: SpeechQuota;
};

/** The speaking-completion token reportAttempt sends back for speaking items. */
export type SpeakingCompletion = {
  completed: boolean;
  transcript?: string;
  transcription_id?: string;
};

// ---------------------------------------------------------------------------
// Conversation (/api/me/conversation-targets)
// ---------------------------------------------------------------------------

export type ConversationTarget = {
  id: string;
  section: string;
  title: string;
  text: string;
};

/** GET /api/me/conversation-targets. */
export type ConversationTargetsResponse = {
  scenario: string;
  targets: ConversationTarget[];
  message: string;
};

// ---------------------------------------------------------------------------
// Exam and past questions (/api/exam/*)
// ---------------------------------------------------------------------------

/** The metadata_json on exam_questions rows in the normalized dataset. */
export type ExamMetadata = {
  format_reference: string;
  original: boolean;
  audio_item_id?: string;
};

/** One exam_questions row (SELECT *, choices_json AS choices). In the stored
 *  dataset choices_json is a key->text map; callers normalize via
 *  normalizeChoices(). */
export type ExamQuestion = {
  id: string;
  source_id: string;
  external_id: string;
  exam_name: string;
  cefr_section: string;
  skill: string;
  prompt: string;
  context: string | null;
  choices_json: Record<string, string> | null;
  choices: Record<string, string> | null;
  answer: string | null;
  explanation: string | null;
  source_url: string;
  metadata_json: ExamMetadata;
  created_at: string;
};

/** GET /api/exam/questions?section=<CEFR>. sources is always [] — the server
 *  hardcodes it (reserved for future source attribution). */
export type ExamQuestionsResponse = {
  section: string;
  questions: ExamQuestion[];
  sources: never[];
};

/** GET /api/exam/past-questions. */
export type PastQuestionsResponse = {
  questions: ExamQuestion[];
  sources: never[];
};

// ---------------------------------------------------------------------------
// Deprecated legacy track (/api/content/sections, /topics, /tv5-exercises)
// ---------------------------------------------------------------------------

/** One row of the sections() summary (GET /api/content/sections). COUNT(*)
 *  and AVG() arrive over the wire as strings: node-postgres returns bigint
 *  and numeric as strings. */
export type ContentSectionSummary = {
  section: string;
  example_count: string;
  exercise_count: string;
  average_tokens: string;
};

/** The content_sources row behind the sections summary. */
export type ContentSourceSummary = {
  name: string;
  url: string;
  license: string;
  attribution: string;
  imported_at: string;
};

/** One example_sentences row. metadata_json is a string map per the UD
 *  import (scripts/import-ud-gsd.mjs). */
export type ExampleSentence = {
  id: string;
  source_id: string;
  source_sentence_id: string;
  text: string;
  cefr_section: string;
  token_count: number;
  verb_count: number;
  noun_count: number;
  adjective_count: number;
  adposition_count: number;
  has_subordination: boolean;
  difficulty_score: number;
  metadata_json: Record<string, string>;
  created_at: string;
};

/** One exercise_items row as served by section(): choices_json is parsed by
 *  the pg driver (string[] per the UD import) and re-exposed as `choices`;
 *  the raw choices_json key is dropped before serialization. */
export type SectionExercise = {
  id: string;
  example_id: string;
  cefr_section: string;
  exercise_type: string;
  prompt: string;
  answer: string;
  explanation: string | null;
  created_at: string;
  source_text: string;
  choices: string[] | null;
};

/** GET /api/content/sections (summary) and /api/content/sections/:section
 *  (examples + exercises). */
export type ContentSectionsResponse =
  | { source: ContentSourceSummary | null; sections: ContentSectionSummary[]; note: string }
  | { section: string; examples: ExampleSentence[]; exercises: SectionExercise[] };

/** One learning_topics row (GET /api/content/topics?section=<CEFR>). */
export type LearningTopic = {
  id: string;
  cefr_section: string;
  category: string;
  title: string;
  item: string;
  source_id: string | null;
  created_at: string;
};

/** GET /api/content/topics?section=<CEFR>. */
export type ContentTopicsResponse = {
  section: string;
  topics: LearningTopic[];
};

/** One tv5_exercises row. metadata_json is the catalogue-link marker written
 *  by scripts/import-tv5-exercises.mjs. */
export type Tv5Exercise = {
  id: string;
  source_id: string;
  external_id: string;
  cefr_section: string;
  title: string;
  exercise_url: string;
  metadata_json: { tags: string[]; note: string };
  imported_at: string;
};

/** GET /api/content/tv5-exercises?section=<CEFR|all>. */
export type Tv5ExercisesResponse = {
  section: string;
  exercises: Tv5Exercise[];
};

// ---------------------------------------------------------------------------
// ApiResponse union (for FRA-68)
// ---------------------------------------------------------------------------

/**
 * Every endpoint success-response shape defined in this module, as one
 * union. FRA-68 constrains `useApiResource<T extends ApiResponse>` with it.
 */
export type ApiResponse =
  | HealthResponse
  | AuthResponse
  | MeResponse
  | LessonPositionResponse
  | UpdateProfileResponse
  | PlacementResponse
  | StreakResponse
  | SessionPlanResponse
  | ProgressResponse
  | ReviewDueResponse
  | AttemptResult
  | ContentItemsResponse
  | ContentItemDetail
  | ReviewActionResponse
  | ReportContentResponse
  | ContentItemCountsResponse
  | BatchIngestResponse
  | ContentBatchDetail
  | ContentConceptsResponse
  | SpeechStatusResponse
  | SpeechTranscribeResponse
  | ConversationTargetsResponse
  | ExamQuestionsResponse
  | PastQuestionsResponse
  | ContentSectionsResponse
  | ContentTopicsResponse
  | Tv5ExercisesResponse;

// ---------------------------------------------------------------------------
// Client helpers
// ---------------------------------------------------------------------------

function fallbackForStatus(status: number): string {
  if (status === 401) return 'Your session expired. Please sign in again.';
  if (status === 403) return 'You do not have access to that.';
  if (status === 404) return 'That was not found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again.';
  return 'Request failed. Please try again.';
}

/** True for non-null objects: the only JSON shape we read error fields from. */
function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null;
}

/** Extract the server's error message from an unknown failure payload. */
function errorMessageFrom(payload: unknown, status: number): string {
  if (isJsonObject(payload)) {
    const message = safeText(payload.error) || safeText(payload.message);
    if (message) return message;
  }
  return fallbackForStatus(status);
}

async function parseApiResponse<T = ApiResponse>(response: Response): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The server sent an unreadable response. Please try again.');
  }
  if (!response.ok) {
    throw new Error(errorMessageFrom(payload, response.status));
  }
  // Justification: T is the caller-declared endpoint response shape (the
  // apiGet/apiPost type argument, defaulting to ApiResponse); the JSON body
  // crosses the network boundary here as unknown and this is the single
  // point where it is bound to T. The server contract (server/index.js) is
  // the authority for the shape.
  return payload as T;
}

// Build-time API base URL. Set VITE_API_URL in the host's env vars
// (e.g. Cloudflare Pages) to point the frontend at the API origin.
// Falls back to same-origin relative URLs, which is what local dev uses.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function startGoogleSignIn(): void { window.location.assign(apiUrl('/api/auth/google')); }

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

// (moved to src/presenters/format.presenter.js — re-exported at the top of this file)

// Bookmarks share a write queue across roadmap mounts. Reads wait for the
// close/scroll flush, preventing Home from showing the previous section.
let bookmarkWrites: Promise<void> = Promise.resolve();

async function runBookmarkWrite(
  previous: Promise<void>,
  write: () => Promise<{saved:boolean}>,
): Promise<{saved:boolean}> {
  await previous;
  return await write();
}

export function saveLessonBookmark(slug: string, section: LessonSection, token: string): Promise<{saved:boolean}> {
  const request = runBookmarkWrite(
    bookmarkWrites,
    () => apiPost<{saved:boolean}>('/api/me/lesson-position',{concept_slug:slug,section},token),
  );
  bookmarkWrites = request.then(() => {},() => {});
  return request;
}

export async function apiGet<T = ApiResponse>(path: string, token?: string | null, options: ApiRequestOptions = {}): Promise<T> {
  if (path === '/api/me/lesson-position') await bookmarkWrites;
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;
  const response = await fetch(apiUrl(path), { headers, cache: 'no-store' });
  return parseApiResponse(response);
}

export async function apiPost<T = ApiResponse>(path: string, body?: JsonValue, token?: string | null, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return parseApiResponse(response);
}

// shuffle / normalizeChoices / sanitizeEntry moved to
// src/presenters/collections.presenter.js and src/presenters/entry.presenter.js — re-exported
// at the top of this file.

let speechStatusToken: string | null | undefined = null;
let speechStatusRequest: Promise<SpeechStatusResponse> | null = null;
export function getSpeechStatus(token?: string | null): Promise<SpeechStatusResponse> {
  if (speechStatusToken !== token) { speechStatusToken = token; speechStatusRequest = null; }
  speechStatusRequest ||= apiGet<SpeechStatusResponse>('/api/speech/status', token).catch((error) => { speechStatusRequest = null; throw error; });
  return speechStatusRequest;
}

export async function uploadSpeech(itemId: string, audio: Blob, token: string, practiceId: string | null = null): Promise<SpeechTranscribeResponse> {
  const path = '/api/speech/transcribe?item_id=' + encodeURIComponent(itemId) + (practiceId ? '&practice=' + encodeURIComponent(practiceId) : '');
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': audio.type },
    body: audio,
  });
  return parseApiResponse(response);
}

// Report an answered exercise to the adaptive engine. Every renderer calls
// this; the server grades, updates SM-2 state, and returns { correct, reveal }.
export function reportAttempt(entry: ReportAttemptEntry, response: AttemptResponse, token?: string | null, extra: ReportAttemptExtra = {}): Promise<AttemptResult> {
  const payload: AttemptRequest = {
    item_kind: entry.item_kind,
    response,
    duration_ms: extra.durationMs ?? null,
    hint_used: Boolean(extra.hintUsed),
    session_id: extra.sessionId ?? null,
    // FRA-44: the learner's IANA timezone, so the server can roll the
    // attempt into the correct learner-local activity day.
    timezone: browserTimeZone(),
  };
  if (entry.item_kind === 'content_item') payload.item_id = entry.id;
  else payload.legacy_ref = entry.id;
  return apiPost<AttemptResult>('/api/me/attempts', payload, token);
}
