import React from 'react';
import { MultipleChoice } from './MultipleChoice';
import { WordOrder } from './WordOrder';
import { Spelling } from './Spelling';
import { PronunciationDrill } from './Listening';
import { WritingPrompt, SpeakingPrompt } from './WritingSpeaking';
import * as UIRaw from '../ui/index.js';

// delete once FRA-63 lands: unconverted JS UI components don't resolve as
// plain `any` for JSX props under allowJs, so alias them loose here.
const { Box, ReportButton }: Record<string, React.ComponentType<any>> = UIRaw;
import { sanitizeEntry } from '../../presenters/entry.presenter.js';

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export interface ExerciseItem {
  id?: string | number | null;
  type?: string;
  item_kind?: string;
  media?: { url?: string; [key: string]: unknown }[];
  [key: string]: unknown;
}

interface ExerciseCardProps {
  entry: ExerciseItem | null | undefined;
  token?: string | null;
  onResult?: (result: unknown) => void;
}

// One renderer per item type. Every answered item reports an attempt with
// response + duration to the server's adaptive engine.
export function ExerciseCard({ entry, token, onResult }: ExerciseCardProps) {
  // Normalize server snake_case fields for the renderers, then sanitize so
  // object-shaped API values can never crash a renderer or print raw JSON.
  const raw: ExerciseItem = entry && typeof entry === 'object' ? entry : {};
  const rawType = raw.type;
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
