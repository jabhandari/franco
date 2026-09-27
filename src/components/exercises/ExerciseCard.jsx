import React from 'react';
import { MultipleChoice } from './MultipleChoice.jsx';
import { WordOrder } from './WordOrder.jsx';
import { Spelling } from './Spelling.jsx';
import { PronunciationDrill } from './Listening.jsx';
import { WritingPrompt, SpeakingPrompt } from './WritingSpeaking.jsx';

// One renderer per item type. Every answered item reports an attempt with
// response + duration to the server's adaptive engine.
export function ExerciseCard({ entry, token, onResult }) {
  // Normalize server snake_case fields for the renderers.
  const item = {
    ...entry,
    expectedPoints: entry.expectedPoints ?? entry.expected_points,
    followUpQuestions: entry.followUpQuestions ?? entry.follow_up_questions,
  };
  switch (item.type) {
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
