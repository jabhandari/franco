import React from 'react';
import { Check, CheckCircle2, Flag, KeyRound, RefreshCw, Send, X } from 'lucide-react';
import { apiGet, apiPost, formatEnum, getErrorMessage, normalizeChoices, safeText } from '../api/client.js';
import { Button, EmptyState, ErrorMessage, Field, PageHeader, Panel, Text } from '../components/ui';

// FRA-2: review queue UI for pending content items. The review endpoints
// authenticate with a content:review API key (x-api-key), not the learner
// Bearer token, so the key is kept in localStorage only and never put in
// a URL. main.jsx reads the same key to decide whether to show the nav
// link.
export const REVIEW_KEY_STORAGE = 'franco_review_key';
const QUEUE_PATH = '/api/content/v1/items?status=pending_review&limit=50';
const MAX_NOTE_LENGTH = 500;

export function ReviewQueue({ onKeyChange }) {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(REVIEW_KEY_STORAGE) || '');
  const [keyDraft, setKeyDraft] = React.useState('');
  const [items, setItems] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notes, setNotes] = React.useState({});
  const [busyId, setBusyId] = React.useState(null);
  const [rowErrors, setRowErrors] = React.useState({});

  const load = React.useCallback(async (key) => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const payload = await apiGet(QUEUE_PATH, null, { apiKey: key });
      // Learner-flagged items first: they were already live and may be
      // actively wrong, so they outrank brand-new source items.
      const list = [...(payload.items || [])].sort((a, b) => (b.report_count || 0) - (a.report_count || 0));
      setItems(list);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (apiKey) load(apiKey);
  }, [apiKey, load]);

  function saveKey(event) {
    event.preventDefault();
    const key = keyDraft.trim();
    if (!key) return;
    localStorage.setItem(REVIEW_KEY_STORAGE, key);
    setApiKey(key);
    onKeyChange?.(true);
  }

  function clearKey() {
    localStorage.removeItem(REVIEW_KEY_STORAGE);
    setApiKey('');
    setKeyDraft('');
    setItems(null);
    setError('');
    onKeyChange?.(false);
  }

  async function act(item, action) {
    setBusyId(item.id);
    setRowErrors((prev) => ({ ...prev, [item.id]: '' }));
    try {
      const note = safeText(notes[item.id]).trim().slice(0, MAX_NOTE_LENGTH);
      await apiPost(`/api/content/v1/items/${item.id}/${action}`, note ? { note } : {}, null, { apiKey });
      setItems((prev) => (prev || []).filter((row) => row.id !== item.id));
    } catch (actError) {
      setRowErrors((prev) => ({ ...prev, [item.id]: getErrorMessage(actError) }));
    } finally {
      setBusyId(null);
    }
  }

  if (!apiKey) {
    return (
      <div className="page-stack">
        <div>
          <PageHeader
            eyebrow="Content review"
            title="Review queue"
            lede="Approve, publish, or reject new source items and questions learners have flagged. This needs a content review API key."
          />
        </div>
        <Panel>
          <form className="review-key-form" onSubmit={saveKey}>
            <Field label="Review API key" icon={KeyRound}>
              <input
                type="password"
                value={keyDraft}
                onChange={(event) => setKeyDraft(event.target.value)}
                placeholder="API key with the content:review scope"
                autoComplete="off"
              />
            </Field>
            <Button variant="primary" type="submit" icon={KeyRound} iconSize={18} disabled={!keyDraft.trim()}>
              Save key and load the queue
            </Button>
            <Text variant="note">
              The key is stored only in this browser and sent only as a request header to this app — never in a URL.
            </Text>
          </form>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div>
        <PageHeader
          eyebrow="Content review"
          title="Review queue"
          lede="New items from content sources land here as pending review, and so do published questions that learners keep flagging. Publishing is what grows the question bank."
        />
      </div>

      <div className="review-toolbar">
        <Text variant="muted">
          {loading ? 'Loading…' : items ? `${items.length} item${items.length === 1 ? '' : 's'} waiting for review` : ''}
        </Text>
        <div className="review-actions">
          <Button variant="text" icon={RefreshCw} iconSize={16} onClick={() => load(apiKey)} disabled={loading}>
            Refresh
          </Button>
          <Button variant="text" onClick={clearKey}>
            Remove key
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {items && items.length === 0 && !loading && (
        <EmptyState
          icon={CheckCircle2}
          title="Queue clear"
          text="Nothing is waiting for review. New source batches and learner-flagged items will show up here."
        />
      )}

      {(items || []).map((item) => (
        <ReviewItem
          key={item.id}
          item={item}
          note={notes[item.id] || ''}
          busy={busyId === item.id}
          error={rowErrors[item.id] || ''}
          onNote={(value) => setNotes((prev) => ({ ...prev, [item.id]: value }))}
          onAct={(action) => act(item, action)}
        />
      ))}
    </div>
  );
}

function ReviewItem({ item, note, busy, error, onNote, onAct }) {
  const choices = normalizeChoices(item.choices);
  const expected = safeText(item.expected);
  const expectedPoints = Array.isArray(item.expected_points) ? item.expected_points : [];
  const flagged = (item.report_count || 0) > 0;
  const isCorrectChoice = (choice) => {
    if (!expected) return false;
    const target = expected.trim().toLowerCase();
    return choice.key.trim().toLowerCase() === target || choice.text.trim().toLowerCase() === target;
  };

  return (
    <Panel>
      <article className="review-item">
        <div className="review-pills">
          <span className="review-pill">{formatEnum(item.type) || 'Item'}</span>
          {item.level && <span className="review-pill">{item.level}</span>}
          {item.source && <span className="review-pill">{item.source}</span>}
          {item.external_id && <span className="review-pill">{item.external_id}</span>}
          {flagged && (
            <span className="review-pill flagged">
              <Flag size={12} aria-hidden="true" />
              {item.report_count} learner report{item.report_count === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {item.title && <h3>{item.title}</h3>}
        <p className="review-prompt">{safeText(item.prompt)}</p>
        {item.context && safeText(item.context) !== safeText(item.prompt) && (
          <Text variant="muted">{safeText(item.context)}</Text>
        )}
        {item.instructions && <Text variant="muted">{safeText(item.instructions)}</Text>}

        {(choices.length > 0 || expected || expectedPoints.length > 0) && (
          <div className="review-expected">
            <strong>Answer / expected</strong>
            {choices.length > 0 && (
              <ul className="review-choices">
                {choices.map((choice) => (
                  <li key={choice.key} className={isCorrectChoice(choice) ? 'correct' : ''}>
                    {choice.key}. {choice.text}
                    {isCorrectChoice(choice) ? ' ✓' : ''}
                  </li>
                ))}
              </ul>
            )}
            {expected && choices.length === 0 && <p>{expected}</p>}
            {expectedPoints.length > 0 && (
              <ul className="review-choices">
                {expectedPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <input
          className="review-note"
          type="text"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Reviewer note (optional, saved with the decision)"
          aria-label="Reviewer note"
        />

        {error && <ErrorMessage message={error} />}

        <div className="review-item-actions">
          <Button variant="text" icon={Check} iconSize={16} disabled={busy} onClick={() => onAct('approve')}>
            Approve
          </Button>
          <Button variant="primary" icon={Send} iconSize={16} disabled={busy} onClick={() => onAct('publish')}>
            Publish
          </Button>
          <button
            type="button"
            className="text-button review-danger"
            disabled={busy}
            onClick={() => onAct('reject')}
          >
            <X size={16} aria-hidden="true" /> Reject
          </button>
        </div>
      </article>
    </Panel>
  );
}
