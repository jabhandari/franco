import React from 'react';
import { Flag } from 'lucide-react';
import { MultipleChoice } from './MultipleChoice.jsx';
import { WordOrder } from './WordOrder.jsx';
import { Spelling } from './Spelling.jsx';
import { PronunciationDrill } from './Listening.jsx';
import { WritingPrompt, SpeakingPrompt } from './WritingSpeaking.jsx';
import { apiPost, sanitizeEntry } from '../../api/client.js';

const REPORT_REASONS = [
  { id: 'wrong_answer', label: 'Wrong answer' },
  { id: 'unclear_prompt', label: 'Unclear prompt' },
  { id: 'typo', label: 'Typo or language error' },
  { id: 'offensive', label: 'Offensive content' },
  { id: 'other', label: 'Something else' },
];

// Learner QA: flagging a suspect item files a report; enough distinct reports
// auto-demote the item back to pending_review for human re-review.
function ReportButton({ itemId, token }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('wrong_answer');
  const [note, setNote] = React.useState('');
  const [state, setState] = React.useState('idle'); // idle | sending | done | error

  async function submit() {
    setState('sending');
    try {
      await apiPost(`/api/content/v1/items/${itemId}/report`, { reason, note: note.trim() || undefined }, token);
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') return <p className="report-thanks">Thanks — we've flagged this for review.</p>;
  if (!open) {
    return (
      <button type="button" className="text-button report-toggle" onClick={() => setOpen(true)}>
        <Flag size={13} aria-hidden="true" /> Report a problem
      </button>
    );
  }
  return (
    <div className="report-form">
      <label>
        What's wrong?
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          {REPORT_REASONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        Details (optional)
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="What should we fix?" />
      </label>
      {state === 'error' && <p className="error-message">Couldn't send the report. Please try again.</p>}
      <div className="report-actions">
        <button type="button" className="text-button" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="primary-button" onClick={submit} disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </div>
  );
}

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
