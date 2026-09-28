import React from 'react';
import { MultipleChoice } from './MultipleChoice.jsx';
import { WordOrder } from './WordOrder.jsx';
import { Spelling } from './Spelling.jsx';
import { PronunciationDrill } from './Listening.jsx';
import { WritingPrompt, SpeakingPrompt } from './WritingSpeaking.jsx';
import { ReportButton } from '../ui/index.js';
import { sanitizeEntry } from '../../api/client.js';

// One renderer per item type. Every answered item reports an attempt with
// response + duration to the server's adaptive engine.
export function ExerciseCard({ entry, token, onResult }) {
  // Normalize server snake_case fields for the renderers, then sanitize so
  // object-shaped API values can never crash a renderer or print raw JSON.
  const raw = entry && typeof entry === 'object' ? entry : {};
  const rawType = raw.type;
  const item = sanitizeEntry({
    ...raw,
    expectedPoints: raw.expectedPoints ?? raw.expected_points,
    followUpQuestions: raw.followUpQuestions ?? raw.follow_up_questions,
  });
  let rendered;
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

function ReportableExercise({ item, token, children }) {
  const reportable = item.item_kind === 'content_item' && item.id && token;
  return (
    <div className="exercise-card-wrap">
      {children}
      {reportable && <ReportButton itemId={item.id} token={token} />}
    </div>
  );
}
