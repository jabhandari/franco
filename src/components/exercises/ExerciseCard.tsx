import React from 'react';
import { MultipleChoice } from './MultipleChoice';
import { WordOrder } from './WordOrder';
import { Spelling } from './Spelling';
import { PronunciationDrill } from './Listening';
import { WritingPrompt, SpeakingPrompt } from './WritingSpeaking';
import type { MediaAsset } from './Listening';
import * as UIRaw from '../ui/index.js';

type BoxProps = {
  className?: string;
  children?: React.ReactNode;
};

type ReportButtonProps = {
  itemId?: string | number | null;
  token?: string | null;
};

// Interim ui/ bridge (deleted once FRA-63 lands): src/components/ui is still
// .jsx, so its exports resolve as `any` under allowJs and precise prop types
// are unknowable from this file. Justification for each `as` below: the
// assertion restores a minimal typed surface — only the props this file
// passes — until the library converts to TSX, when this block is removed.
const Box = UIRaw.Box as React.ComponentType<BoxProps>;
const ReportButton = UIRaw.ReportButton as React.ComponentType<ReportButtonProps>;
import { sanitizeEntry } from '../../presenters/entry.presenter.js';

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
//
// Entry shape after sanitizeEntry() (src/presenters/entry.presenter.js):
// server snake_case fields normalized to camelCase where the renderers need
// them. MediaAsset is defined in ./Listening (FRA-68 moves it to
// src/types.ts with the other shared content shapes).
//
// `level`/`prompt` are read by every renderer below, so they live here too:
// the per-renderer item types share these props with ExerciseItem, which is
// what makes the ExerciseCard -> renderer handoff typecheck.
export type ExerciseItem = {
  id?: string | number | null;
  type?: string;
  item_kind?: string;
  level?: string;
  prompt?: string;
  media?: MediaAsset[];
  expectedPoints?: string[];
  expected_points?: string[];
  followUpQuestions?: string[];
  follow_up_questions?: string[];
};

// Attempt rows returned by POST /api/me/attempts (server/index.js):
// { attempt, correct, score, reveal, next_due_at }. Renderers only read
// correct/reveal; error is set locally when reportAttempt throws.
export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type ExerciseCardProps = {
  entry: ExerciseItem | null | undefined;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
};

// One renderer per item type. Every answered item reports an attempt with
// response + duration to the server's adaptive engine.
export function ExerciseCard({ entry, token, onResult }: ExerciseCardProps) {
  // Normalize server snake_case fields for the renderers, then sanitize so
  // object-shaped API values can never crash a renderer or print raw JSON.
  const raw: ExerciseItem = entry && typeof entry === 'object' ? entry : {};
  const rawType = raw.type;
  // Justification for the `as`: sanitizeEntry is an untyped JS boundary
  // (entry.presenter.js is still JS) returning a sanitized copy of the same
  // object — the shape is unchanged, so the assertion restores the known
  // ExerciseItem type. Proper typing is impossible until the presenter
  // converts to TS.
  const item = sanitizeEntry({
    ...raw,
    expectedPoints: raw.expectedPoints ?? raw.expected_points,
    followUpQuestions: raw.followUpQuestions ?? raw.follow_up_questions,
  }) as ExerciseItem;
  let rendered: React.ReactNode;
  switch (rawType) {
    case 'word_order':
      rendered = <WordOrder entry={item} token={token} onResult={onResult} />;
      break;
    case 'spelling':
    case 'cloze':
    case 'free_text':
      rendered = <Spelling entry={item} token={token} onResult={onResult} />;
      break;
    case 'dictation':
      rendered = <Spelling entry={item} token={token} onResult={onResult} audioUrl={(item.media || [])[0]?.url} />;
      break;
    case 'pronunciation_drill':
      rendered = <PronunciationDrill entry={item} token={token} onResult={onResult} />;
      break;
    case 'writing_prompt':
      rendered = <WritingPrompt entry={item} token={token} onResult={onResult} />;
      break;
    case 'speaking_prompt':
      rendered = <SpeakingPrompt entry={item} token={token} onResult={onResult} />;
      break;
    case 'multiple_choice':
    case 'reading':
    case 'grammar_focus':
    case 'listening':
    default:
      rendered = <MultipleChoice entry={item} token={token} onResult={onResult} />;
  }
  return <ReportableExercise item={item} token={token}>{rendered}</ReportableExercise>;
}

function ReportableExercise({ item, token, children }: { item: ExerciseItem; token?: string | null; children: React.ReactNode }) {
  const reportable = item.item_kind === 'content_item' && item.id && token;
  return (
    <Box className="exercise-card-wrap">
      {children}
      {reportable && <ReportButton itemId={item.id} token={token} />}
    </Box>
  );
}
