import React from 'react';
import { MultipleChoice } from './MultipleChoice.jsx';
import { WordOrder } from './WordOrder.jsx';
import { Spelling } from './Spelling.jsx';
import { PronunciationDrill } from './Listening.jsx';
import { WritingPrompt, SpeakingPrompt } from './WritingSpeaking.jsx';
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
  switch (rawType) {
    case 'word_order':
      return <WordOrder entry={item} token={token} onResult={onResult} />;
    case 'spelling':
    case 'cloze':
    case 'free_text':
      return <Spelling entry={item} token={token} onResult={onResult} />;
    case 'dictation':
      return <Spelling entry={item} token={token} onResult={onResult} audioUrl={(item.media || [])[0]?.url} />;
    case 'pronunciation_drill':
      return <PronunciationDrill entry={item} token={token} onResult={onResult} />;
    case 'writing_prompt':
      return <WritingPrompt entry={item} token={token} onResult={onResult} />;
    case 'speaking_prompt':
      return <SpeakingPrompt entry={item} token={token} onResult={onResult} />;
    case 'multiple_choice':
    case 'reading':
    case 'grammar_focus':
    case 'listening':
    default:
      return <MultipleChoice entry={item} token={token} onResult={onResult} />;
  }
}
