import React from 'react';
import { reportAttempt } from '../../api/client.js';

// Writing prompt: free-form text graded against the server-side rubric.
export function WritingPrompt({ entry, token, onResult }) {
  const [value, setValue] = React.useState('');
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());
  const rubric = entry.rubric || {};

  async function submit(event) {
    event?.preventDefault();
    if (result || value.trim().length < 10) return;
    try {
      const res = await reportAttempt(entry, value, token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: error.message });
    }
  }

  return (
    <article className="exercise-preview mcq-card">
      <span>{entry.level} · writing</span>
      <h2>{entry.title || 'Writing prompt'}</h2>
      <p>{entry.prompt}</p>
      {entry.instructions && <p className="muted">{entry.instructions}</p>}
      {Object.keys(rubric).length > 0 && (
        <div className="rubric-box">
          <strong>Grading rubric</strong>
          <ul>
            {Object.entries(rubric).map(([criterion, description]) => (
              <li key={criterion}><strong>{criterion.replace(/_/g, ' ')}</strong>: {description}</li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={submit}>
        <textarea
          className="free-text-input"
          rows={6}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write your answer in French…"
          disabled={Boolean(result)}
        />
        {!result && (
          <button type="submit" className="primary-button" disabled={value.trim().length < 10}>
            Submit writing
          </button>
        )}
      </form>
      {result && !result.error && (
        <div className="mcq-feedback correct">
          <strong>Submitted.</strong>
          <span>Compare your text against the rubric above — completion has been logged.</span>
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </article>
  );
}

// Speaking prompt: topic + follow-up questions, marked complete when done.
export function SpeakingPrompt({ entry, token, onResult }) {
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());
  const points = entry.expectedPoints || [];
  const followUps = entry.followUpQuestions || [];

  async function markComplete() {
    if (result) return;
    try {
      const res = await reportAttempt(entry, 'completed', token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: error.message });
    }
  }

  return (
    <article className="exercise-preview mcq-card">
      <span>{entry.level} · speaking</span>
      <h2>{entry.title || 'Speaking practice'}</h2>
      <p>{entry.prompt}</p>
      {entry.instructions && <p className="muted">{entry.instructions}</p>}
      {followUps.length > 0 && (
        <div className="rubric-box">
          <strong>Follow-up questions</strong>
          <ul>
            {followUps.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      {!result && (
        <>
          <p className="muted">Speak your answer aloud, then mark it complete.</p>
          <button className="primary-button" onClick={markComplete}>Mark complete</button>
        </>
      )}
      {result && !result.error && (
        <div className="mcq-feedback correct">
          <strong>Logged.</strong>
          {points.length > 0 && (
            <ul>
              {points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </article>
  );
}
