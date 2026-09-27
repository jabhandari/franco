import React from 'react';
import { BookOpen, RotateCcw, Zap } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard.jsx';
import { EmptyState, QueueKindLabel, RecordCount } from '../components/ui.jsx';

const SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function Session({ token }) {
  const [selectedSection, setSelectedSection] = React.useState('A1');
  const [runId, setRunId] = React.useState(0);
  const [index, setIndex] = React.useState(0);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [answeredCount, setAnsweredCount] = React.useState(0);

  const { data, loading, error } = useApiResource(
    `/api/me/session-plan?section=${selectedSection}&run=${runId}`,
    token
  );

  React.useEffect(() => {
    setIndex(0);
    setCorrectCount(0);
    setAnsweredCount(0);
  }, [selectedSection, runId]);

  const queue = data?.queue || [];
  const entry = queue[index];
  const finished = queue.length > 0 && index >= queue.length;

  function handleResult(result) {
    if (!result || result.error) return;
    setAnsweredCount((n) => n + 1);
    if (result.correct) setCorrectCount((n) => n + 1);
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Adaptive session</p>
            <h2>Your next session</h2>
          </div>
          <Zap size={20} aria-hidden="true" />
        </div>
        <p className="muted">
          Built from your spaced-repetition reviews, new items at your level, and
          your weakest concepts — no random ordering.
        </p>
        <div className="section-tabs">
          {SECTIONS.map((section) => (
            <button
              key={section}
              className={`section-tab ${selectedSection === section ? 'active' : ''}`}
              onClick={() => setSelectedSection(section)}
            >
              {section}
            </button>
          ))}
        </div>
        <div className="session-stats">
          <RecordCount count={data?.reviewsDue ?? 0} label="reviews due" />
          <RecordCount count={queue.length} label="items queued" />
          <RecordCount count={answeredCount} label="answered" />
          <RecordCount count={correctCount} label="correct" />
        </div>
      </div>

      {loading && <p className="muted">Building your session…</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && !queue.length && (
        <EmptyState
          icon={BookOpen}
          title="No items available"
          text="Nothing is queued for this level yet. Try another level or come back after your next review window."
        />
      )}

      {!loading && !error && entry && !finished && (
        <div className="session-runner">
          <div className="session-progress">
            <span>Question {index + 1} of {queue.length}</span>
            <QueueKindLabel kind={entry.queue_kind} />
          </div>
          <ExerciseCard key={`${entry.item_kind}-${entry.id}`} entry={entry} token={token} onResult={handleResult} />
          <div className="session-nav">
            <button className="retry-button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              Back
            </button>
            <button className="primary-button" onClick={() => setIndex((i) => i + 1)}>
              {index + 1 === queue.length ? 'Finish session' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {!loading && !error && finished && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Session complete</p>
              <h2>{correctCount} of {answeredCount} correct</h2>
            </div>
            <RotateCcw size={20} aria-hidden="true" />
          </div>
          <p className="muted">Your SM-2 schedule and concept mastery were updated from every answer.</p>
          <button className="primary-button" onClick={() => setRunId((r) => r + 1)}>Start a new session</button>
        </div>
      )}
    </div>
  );
}
