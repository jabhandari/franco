// Canonical API boundary types for the franco backend (server/index.js).
// FRA-61 owns these: every view consumes the API through the helpers at the
// bottom of this file. Other wave-2 tickets may define local copies of these
// shapes — FRA-68 unifies them at closeout.
// Shared domain shapes (UserPayload, ContentItemStatus) are imported from
// '../types' and never redefined here — src/types.ts is read-only during
// wave 2.
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
import type { UserPayload, ContentItemStatus } from '../types';

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

/** Standard error payload returned by every API route on failure. */
export interface ApiErrorBody {
  error?: string;
  message?: string;
  code?: string;
}

/** Per-request options: a scoped content API key (x-api-key), never a URL. */
export interface ApiRequestOptions {
  apiKey?: string | null;
}

/** GET /api/health */
export interface HealthResponse {
  ok: boolean;
  database: string;
}

// ---------------------------------------------------------------------------
// Auth (/api/auth/*, /api/me)
// ---------------------------------------------------------------------------

/** Learner profile row (learner_profiles). Columns beyond the core three are
 *  DB-owned; the index signature keeps SELECT * passthroughs honest. */
export interface LearnerProfile {
  user_id: string;
  current_level: string | null;
  placement_status: string | null;
  [key: string]: unknown;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export type AuthRequest = LoginRequest | SignupRequest;

/** POST /api/auth/signup and POST /api/auth/login. */
export interface AuthResponse {
  token: string;
  user: UserPayload;
  profile: null;
  progress: unknown[];
  mistakes: unknown[];
  attempts: unknown[];
}

/** GET /api/me. */
export interface MeResponse {
  user: UserPayload;
  profile: LearnerProfile | null;
  progress: unknown[];
  mistakes: unknown[];
  attempts: unknown[];
}

export interface UpdateProfileRequest {
  first_name: string;
  last_name: string;
}

/** POST /api/me/profile (FRA-56). */
export interface UpdateProfileResponse {
  user: UserPayload;
}

export interface PlacementRequest {
  level: string;
}

/** POST /api/me/placement. */
export interface PlacementResponse {
  level: string;
  placement_status: 'complete';
}

export interface StreakDay {
  date: string;
  attempts: number;
}

/** GET /api/me/streak. */
export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  activeDays: number;
  totalAttempts: number;
  today: string;
  days: StreakDay[];
}

// ---------------------------------------------------------------------------
// Content items and the session queue
// ---------------------------------------------------------------------------

export type ContentQueueKind = 'review' | 'new' | 'weak' | 'exam' | 'drill';

/** The kind of target an attempt grades: a content-bank item or a legacy row. */
export type AttemptItemKind = 'content_item' | 'exam_question' | 'exercise';

export interface ContentMediaAsset {
  kind: string;
  url: string;
  duration_seconds: number | null;
  transcript: string | null;
}

export interface ContentItemChoice {
  key?: string;
  id?: string | number;
  text: string;
  [key: string]: unknown;
}

/** A queue entry as shaped by shapeContentItem()/buildSessionPlan(): the unit
 *  every exercise renderer consumes. Optional fields are only present for the
 *  item types that produce them. */
export interface ContentItemEntry {
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
  evaluation_mode: string | null;
  choices?: ContentItemChoice[];
  tokens?: string[];
  rubric?: unknown;
  expected_points?: unknown;
  follow_up_questions?: unknown;
  expected?: unknown;
}

/** GET /api/me/session-plan (and /api/me/session-plan/:level). */
export interface SessionPlanResponse {
  section: string;
  reviewsDue: number;
  queue: ContentItemEntry[];
  estimatedMinutes: number;
  message: string;
}

/** GET /api/me/progress. */
export interface ProgressResponse {
  items: unknown[];
  concepts: unknown[];
  attempts: unknown[];
}

/** Raw review-due row (SELECT i.*, r.prompt, r.response_json, ...). */
export type ReviewDueItem = Record<string, unknown>;

/** GET /api/me/review-due. */
export interface ReviewDueResponse {
  items: ReviewDueItem[];
}

// ---------------------------------------------------------------------------
// Attempts (/api/me/attempts)
// ---------------------------------------------------------------------------

/** The entry object every exercise renderer hands to reportAttempt. */
export interface ReportAttemptEntry {
  id: string;
  item_kind: AttemptItemKind;
}

export interface ReportAttemptExtra {
  durationMs?: number | null;
  hintUsed?: boolean;
  sessionId?: string | null;
}

/** POST /api/me/attempts request body. */
export interface AttemptRequest {
  item_kind: AttemptItemKind;
  response: unknown;
  duration_ms: number | null;
  hint_used: boolean;
  session_id: string | null;
  timezone: string;
  item_id?: string;
  legacy_ref?: string;
}

/** POST /api/me/attempts response. `attempt` is the inserted learning_attempts
 *  row (RETURNING *); `reveal` is the expected answer, computed after grading. */
export interface AttemptResult {
  attempt: Record<string, unknown>;
  correct: boolean;
  score: number | null;
  reveal: unknown;
  next_due_at: string | null;
}

// ---------------------------------------------------------------------------
// Content v1 (scoped x-api-key) and review actions
// ---------------------------------------------------------------------------

export type ReviewAction = 'approve' | 'reject' | 'publish';

/** Queue row: a shaped item plus review metadata (GET /api/content/v1/items). */
export interface ContentReviewQueueItem extends ContentItemEntry {
  status: ContentItemStatus;
  external_id: string;
  source: string | null;
  batch_id: string | null;
  report_count: number;
}

/** GET /api/content/v1/items. */
export interface ContentItemsResponse {
  items: ContentReviewQueueItem[];
}

/** Raw single-item row (GET /api/content/v1/items/:id). */
export type ContentItemDetail = Record<string, unknown>;

export interface ReviewActionRequest {
  note?: string;
}

/** POST /api/content/v1/items/:id/{approve,reject,publish}. */
export interface ReviewActionResponse {
  id: string;
  status: ContentItemStatus;
}

export interface ReportContentRequest {
  reason: string;
  note?: string | null;
}

/** POST /api/content/v1/items/:id/report (learner Bearer <redacted>). */
export interface ReportContentResponse {
  reported: boolean;
  reports: number;
  demoted: boolean;
}

/** GET /api/content/v1/item-counts?level=<CEFR>. */
export interface ContentItemCountsForLevel {
  level: string;
  total: number;
  byType: Record<string, number>;
}

/** GET /api/content/v1/item-counts (no level). */
export interface ContentItemCountsAll {
  counts: Record<string, { total: number; byType: Record<string, number> }>;
}

export type ContentItemCountsResponse = ContentItemCountsForLevel | ContentItemCountsAll;

export interface BatchSource {
  id: string;
  name: string;
  url?: string | null;
  license?: string | null;
  attribution?: string | null;
}

/** POST /api/content/v1/batches request body (validated against
 *  schemas/content.v1.schema.json server-side). */
export interface BatchIngestRequest {
  schema_version?: string;
  batch_id: string;
  idempotency_key: string;
  source: BatchSource;
  items: unknown[];
  auto_publish?: boolean;
}

export interface BatchCreatedItem {
  external_id: string;
  item_id: string;
  status: ContentItemStatus;
}

export interface BatchDuplicateItem {
  external_id: string;
  item_id: string;
  candidate_item_id?: string;
  kind: 'exact' | 'near';
  similarity?: number;
}

/** POST /api/content/v1/batches response (202 on ingest, 200 on idempotent
 *  replay, 422 on validation failure). */
export interface BatchIngestResponse {
  batch_id?: string;
  status?: ContentItemStatus | string;
  item_count?: number;
  validation_errors?: unknown;
  idempotent_replay?: boolean;
  schema_version?: string;
  created?: BatchCreatedItem[];
  duplicates?: BatchDuplicateItem[];
  error?: string;
}

/** GET /api/content/v1/batches/:id. */
export interface BatchItemSummary {
  id: string;
  external_id: string;
  item_type: string;
  status: ContentItemStatus;
  cefr_level: string;
}

export interface ContentBatchDetail {
  id: string;
  status: string;
  item_count: number;
  items: BatchItemSummary[];
  [key: string]: unknown;
}

export interface ContentConcept {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  concept_type: string;
  level_code: string | null;
  parent_id: string | null;
  status: string;
  metadata: Record<string, unknown>;
  prerequisites: string[];
}

/** GET /api/content/v1/concepts. */
export interface ContentConceptsResponse {
  concepts: ContentConcept[];
}

// ---------------------------------------------------------------------------
// Speech (/api/speech/*)
// ---------------------------------------------------------------------------

/** GET /api/speech/status. */
export interface SpeechStatusResponse {
  available: boolean;
  max_seconds: number;
}

export interface SpeechQuota {
  user_requests_remaining_today: number;
  user_audio_seconds_remaining_today: number;
  resets_at: string;
}

export interface SpeechFeedbackToken {
  text: string;
  status: 'matched' | 'missed' | 'extra';
}

export interface SpeechFeedback {
  mode: string;
  expected?: SpeechFeedbackToken[];
  heard?: SpeechFeedbackToken[];
  [key: string]: unknown;
}

/** POST /api/speech/transcribe response. */
export interface SpeechTranscribeResponse {
  transcription_id: string;
  transcript: string;
  duration_seconds: number;
  feedback: SpeechFeedback;
  quota: SpeechQuota;
}

/** The speaking-completion token reportAttempt sends back for speaking items. */
export interface SpeakingCompletion {
  completed: boolean;
  transcript?: string;
  transcription_id?: string;
}

// ---------------------------------------------------------------------------
// Conversation (/api/me/conversation-targets)
// ---------------------------------------------------------------------------

export interface ConversationTarget {
  id: string;
  section: string;
  title: string;
  text: string;
}

/** GET /api/me/conversation-targets. */
export interface ConversationTargetsResponse {
  scenario: string;
  targets: ConversationTarget[];
  message: string;
}

// ---------------------------------------------------------------------------
// Exam and past questions (/api/exam/*)
// ---------------------------------------------------------------------------

export interface ExamQuestion {
  id: string;
  external_id?: string;
  cefr_section: string;
  exam_name?: string;
  skill?: string;
  prompt?: string;
  context?: string;
  /** choices_json as stored; callers normalize via normalizeChoices(). */
  choices: unknown;
  [key: string]: unknown;
}

/** GET /api/exam/questions?section=<CEFR>. */
export interface ExamQuestionsResponse {
  section: string;
  questions: ExamQuestion[];
  sources: unknown[];
}

/** GET /api/exam/past-questions. */
export interface PastQuestionsResponse {
  questions: ExamQuestion[];
  sources: unknown[];
}

// ---------------------------------------------------------------------------
// Deprecated legacy track (/api/content/sections, /topics, /tv5-exercises)
// ---------------------------------------------------------------------------

/** GET /api/content/sections and /api/content/sections/:section. */
export type ContentSectionsResponse = unknown;

/** GET /api/content/topics?section=<CEFR>. */
export interface ContentTopicsResponse {
  section: string;
  topics: Record<string, unknown>[];
}

/** GET /api/content/tv5-exercises?section=<CEFR|all>. */
export interface Tv5ExercisesResponse {
  section: string;
  exercises: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// ApiResponse union (for FRA-68)
// ---------------------------------------------------------------------------

/**
 * Every endpoint success-response shape defined in this module, as one
 * union. FRA-68 constrains `useApiResource<T extends ApiResponse>` with it.
 * ContentSectionsResponse is intentionally excluded: it is typed `unknown`
 * (deprecated legacy track) and would collapse the whole union to unknown.
 */
export type ApiResponse =
  | HealthResponse
  | AuthResponse
  | MeResponse
  | UpdateProfileResponse
  | PlacementResponse
  | StreakResponse
  | SessionPlanResponse
  | ProgressResponse
  | ReviewDueResponse
  | AttemptResult
  | ContentItemsResponse
  | ReviewActionResponse
  | ReportContentResponse
  | ContentItemCountsResponse
  | BatchIngestResponse
  | ContentConceptsResponse
  | SpeechStatusResponse
  | SpeechTranscribeResponse
  | ConversationTargetsResponse
  | ExamQuestionsResponse
  | PastQuestionsResponse
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
function isJsonObject(value: unknown): value is Record<string, unknown> {
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

async function parseApiResponse<T = unknown>(response: Response): Promise<T> {
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
  // apiGet/apiPost type argument, defaulting to unknown); the JSON body
  // crosses the network boundary here as unknown and this is the single
  // point where it is bound to T. The server contract (server/index.js) is
  // the authority for the shape.
  return payload as T;
}

// Build-time API base URL. Set VITE_API_URL in the host's env vars
// (e.g. Cloudflare Pages) to point the frontend at the API origin.
// Falls back to same-origin relative URLs, which is what local dev uses.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

// (moved to src/presenters/format.presenter.js — re-exported at the top of this file)

export async function apiGet<T = unknown>(path: string, token?: string | null, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;
  const response = await fetch(apiUrl(path), { headers, cache: 'no-store' });
  return parseApiResponse(response);
}

export async function apiPost<T = unknown>(path: string, body?: unknown, token?: string | null, options: ApiRequestOptions = {}): Promise<T> {
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
export function reportAttempt(entry: ReportAttemptEntry, response: unknown, token?: string | null, extra: ReportAttemptExtra = {}): Promise<AttemptResult> {
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
