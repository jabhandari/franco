import React from 'react';
import { Flag } from 'lucide-react';
import { apiPost } from '../../api/client.js';
import { Button } from './Button';
import { ErrorMessage } from './Feedback';

const REPORT_REASONS: Array<{ id: string; label: string }> = [
  { id: 'wrong_answer', label: 'Wrong answer' },
  { id: 'unclear_prompt', label: 'Unclear prompt' },
  { id: 'typo', label: 'Typo or language error' },
  { id: 'offensive', label: 'Offensive content' },
  { id: 'other', label: 'Something else' },
];

export type ReportState = 'idle' | 'sending' | 'done' | 'error';

export interface ReportButtonProps {
  itemId: string | number;
  token?: string | null;
  key?: React.Key;
}

// Learner QA: flagging a suspect item files a report; enough distinct reports
// auto-demote the item back to pending_review for human re-review.
export function ReportButton({ itemId, token }: ReportButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('wrong_answer');
  const [note, setNote] = React.useState('');
  const [state, setState] = React.useState<ReportState>('idle');

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
      <Button variant="report" onClick={() => setOpen(true)} icon={Flag} iconSize={16}>
        Report a problem
      </Button>
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
      {state === 'error' && <ErrorMessage message="Couldn't send the report. Please try again." />}
      <div className="report-actions">
        <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send report'}
        </Button>
      </div>
    </div>
  );
}
