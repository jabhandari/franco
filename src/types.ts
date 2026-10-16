/** Public auth screen modes shared by routing and the auth view. */
export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify' | 'check-email' | 'unverified';

/** Messages exchanged with the browser-side pronunciation worker. */
export type PronunciationWorkerRequest = { id: number; samples: Float32Array; reference?: boolean };
export type PronunciationWorkerReply =
  | { id: number; kind: 'progress'; progress: number; file: string }
  | { id: number; kind: 'result'; phones: string[]; loadMs: number; inferenceMs: number; sampleCount: number }
  | { id: number; kind: 'error'; message: string };

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

export type PuzzleRun = {
  id: string;
  game: 'french_rush' | 'verb_sprint';
  combo: number;
  best_combo: number;
  lives: 1 | 3 | 5;
  lives_left: number;
  minutes: 3 | 5 | null;
  score: number;
  answered: number;
  started_at: string;
  server_now: string;
  expires_at: string | null;
  ended_at: string | null;
  status: 'active' | 'finished' | 'abandoned';
  end_reason: 'time' | 'lives' | 'questions_exhausted' | 'left' | 'restarted' | null;
};

export type PuzzleQuestionBase = {
  id: string;
  level: string;
  type: string;
  prompt: string;
  context: string | null;
  instructions: string | null;
  audio_url: string | null;
};

export type PuzzleQuestion = PuzzleQuestionBase & (
  { kind: 'choice'; choices: { id: string; text: string }[] } |
  { kind: 'word_order'; tokens: { id: string; text: string }[] }
);

export type PuzzleState = { run: PuzzleRun; question: PuzzleQuestion | null };
export type PuzzleAnswer = PuzzleState & { correct?: boolean; reveal?: string; timed_out?: boolean };
export type PuzzleSummary = {
  best: number;
  active: PuzzleRun | null;
  records: { lives: number; minutes: number | null; best: number }[];
  verb_best: number;
  verb_active: PuzzleRun | null;
};

/** Content item types. Matches `CONTENT_TYPES` in server/content-contract.js. */
export type ContentItemType =
  | 'multiple_choice'
  | 'cloze'
  | 'free_text'
  | 'listen_repeat'
  | 'speaking_prompt'
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


export type CurriculumProvenance = {
  kind: 'original' | 'adapted' | 'source_derived' | 'link_only';
  source_url: string | null;
  source_author: string;
  license_id: string;
  attribution_text: string;
  reviewer_approval?: string;
};
export type CurriculumQuestion = {
  id: string;
  prompt: string;
  choices?: { id: string; text: string }[];
  correct_answers: string[];
  feedback: { rule: string; error: string; remediation: string };
  provenance: CurriculumProvenance;
};
export type CurriculumLesson = {
  topic_id: string;
  level: CefrLevel;
  outcome: string;
  explanation: string;
  example_items: { french: string; english: string; provenance: CurriculumProvenance }[];
  recognition: CurriculumQuestion[];
  guided_production: CurriculumQuestion[];
  reading: { french: string; english: string; prompt: string; provenance: CurriculumProvenance };
  realistic_use: { prompt: string; rubric: string[]; model: string; model_translation: string };
  feedback: { rule: string; error: string; remediation: string };
  mastery: CurriculumQuestion[];
  review_status: string;
  version: number;
  review_due_policy: { initial_days: number; subsequent_days: number[] };
};
export type StoryState = 'current' | 'completed' | 'skipped';
export type StoryStop = {id:string;title:string;title_en:string;level:CefrLevel;order_index:number;state:StoryState;answered:number};
export type StoryQuestion = {id:string;prompt:string;options:{id:string;text:string}[]};
export type ReadingStory = {id:string;title:string;title_en:string;level:CefrLevel;text:string;glossary:{french:string;english:string}[];version:number;questions:StoryQuestion[];answered_question_ids:string[]};
export type StoryActionResult = {story_id:string;state:StoryState;correct:boolean|null;explanation:string|null;answered_question_ids:string[]};

export type LearnStatus = 'not_started' | 'in_progress' | 'completed';
export type LearnProgressRow = { topic_id:string; subtopic_id:string; status:'in_progress'|'completed'; updated_at:string };
export type LearnProgressResponse = { level:CefrLevel; subtopics:LearnProgressRow[] };
export type LearnProgressInput = Pick<LearnProgressRow,'topic_id'|'subtopic_id'|'status'>;
export type LearnSubtopic = { subtopicId:string; title:string; state:LearnStatus };
export type LearnTopicCard = { slug:string; topicId:string; title:string; description:string; subtopicCount:number; doneCount:number; state:LearnStatus; colour:string; icon:string; subtopics:LearnSubtopic[] };
export type LearnJump = { topicTitle:string; subtopicTitle:string; slug:string; subtopicId:string };
export type LearnRoute = { level:CefrLevel; topic?:string; subtopic?:string };
export type ChatProfile = { display_name: string; is_moderator: boolean };
export type ChatBootstrap = { available: boolean; guidelines: string[]; guidelines_version: string; guidelines_approved: boolean; profile: ChatProfile | null };
export type ChatChannel = { slug: string; title: string; description: string; slow_mode_seconds: number; unread: number; last_read_seq: string };
export type ChatMessage = { id: string; seq: string; channel_id: string; display_name: string; body: string; status: 'visible' | 'flagged' | 'hidden' | 'deleted'; own: boolean; created_at: string };
export type ChatHistory = { messages: ChatMessage[]; has_more: boolean; before: string | null; last_read_seq: string };
export type ChatSendResult = { message: ChatMessage; french_nudge: boolean; deduplicated: boolean };
export type ChatRealtimeTicket = { token: string; expires_at: string; url: string; publishable_key: string; presence_key: string };
export type ChatOutboxEntry = { key: string; user_id: string; client_msg_id: string; channel: string; body: string; created_at: number; status: 'queued' | 'failed'; error: string };
export type ChatModMessage = { id: string; channel_id: string; display_name: string; body: string; status: string; toxicity_score: number | null; created_at: string; moderation_state: string; reports: number; reasons: { reason: string }[] | null; context: { display_name: string; body: string; created_at: string }[] | null };
