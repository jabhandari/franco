import { CurriculumReview } from '../components/CurriculumReview';
import React from 'react';
import { Check, CheckCircle2, Flag, KeyRound, RefreshCw, Send, X } from 'lucide-react';
import { apiGet, apiPost, formatEnum, getErrorMessage, normalizeChoices, safeText } from '../api/client.js';
import type { ContentItemChoice } from '../api/client.js';
import {
  Box,
  Button,
  EmptyState,
  ErrorMessage,
  Field,
  Page,
  PageHeader,
  Panel,
  Tabs,
  Text,
  TextInput,
} from '../components/ui';

// Choices as shaped by shapeContentItem() (server/index.js): verbatim
// response_json.choices — id-bearing {id,text} pairs for published items.
// Canonical type imported from the API client (never redefined).
type ChoicesInput = ContentItemChoice[] | null | undefined;

// Output contract of normalizeChoices(): filtered { key, text } pairs.
type NormalizedChoice = { key: string; text: string };

// FRA-67: local types for the review-queue payloads. ReviewQueueItem models
// GET /api/content/v1/items?status=… — the same shaped item as Content.tsx's
// list (shapeContentItem() in server/index.js); only the fields this view
// reads are included. Canonical ownership of the content-item shape belongs
// to a later ticket (see "Notes for FRA-68").
type ReviewStatus = 'pending_review' | 'approved' | 'published';
type ReviewAction = 'approve' | 'publish' | 'reject';

type ReviewQueueItem = {
  id: string;
  status: string;
  type: string | null;
  level: string | null;
  source: string | null;
  external_id: string | null;
  report_count: number;
  title: string | null;
  prompt: string | null;
  context: string | null;
  instructions: string | null;
  choices: ChoicesInput;
  expected: string | null;
  expected_points: string[] | null;
};

type ReviewQueueProps = {
  onKeyChange?: (hasKey: boolean) => void;
};

type ReviewItemProps = {
  key?: React.Key;
  item: ReviewQueueItem;
  note: string;
  busy: boolean;
  error: string;
  onNote: (value: string) => void;
  onAct: (action: ReviewAction) => void;
};

// FRA-2: review queue UI for the content bank. The review endpoints
// authenticate with a content:review API key (x-api-key), not the learner
// Bearer <redacted>, so the key is kept in localStorage only and never put in
// a URL. main.jsx reads the same key to decide whether to show the nav
// link.
export const REVIEW_KEY_STORAGE = 'franco_review_key';
const MAX_NOTE_LENGTH = 500;

// Status tabs: the queue proper (pending), items vetted and ready to go
// live (approved), and the live content bank (published) — rejecting a
// published item takes it offline.
const STATUS_TABS: { id: ReviewStatus; label: string }[] = [
  { id: 'pending_review', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
];
const STATUS_COPY: Record<ReviewStatus, { count: (n: number) => string; emptyTitle: string; emptyText: string }> = {
  pending_review: {
    count: (n) => `${n} item${n === 1 ? '' : 's'} waiting for review`,
    emptyTitle: 'Queue clear',
    emptyText: 'Nothing is waiting for review. New source batches and learner-flagged items will show up here.',
  },
  approved: {
    count: (n) => `${n} item${n === 1 ? '' : 's'} approved, ready to publish`,
    emptyTitle: 'Nothing approved yet',
    emptyText: 'Items you approve wait here until you publish them.',
  },
  published: {
    count: (n) => `${n} live item${n === 1 ? '' : 's'}`,
    emptyTitle: 'Nothing published yet',
    emptyText: 'Published items from the content bank will show up here.',
  },
};

function queuePath(status: ReviewStatus) {
  return `/api/content/v1/items?status=${status}&limit=50`;
}

export function ReviewQueue({ onKeyChange }: ReviewQueueProps) {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(REVIEW_KEY_STORAGE) || '');
  const [keyDraft, setKeyDraft] = React.useState('');
  const [status, setStatus] = React.useState<ReviewStatus>('pending_review');
  const [items, setItems] = React.useState<ReviewQueueItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async (key: string, forStatus: ReviewStatus) => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const payload = await apiGet<{ items: ReviewQueueItem[] }>(queuePath(forStatus), null, { apiKey: key });
      // Learner-flagged items first: they were already live and may be
      // actively wrong, so they outrank brand-new source items.
      const list: ReviewQueueItem[] = [...(payload.items || [])].sort((a, b) => (b.report_count || 0) - (a.report_count || 0));
      setItems(list);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (apiKey) load(apiKey, status);
  }, [apiKey, status, load]);

  function saveKey(event: React.FormEvent) {
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

  async function act(item: ReviewQueueItem, action: ReviewAction) {
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
      <Page>
        <PageHeader
          eyebrow="Content review"
          title="Review queue"
          lede="Approve, publish, or reject new source items and questions learners have flagged. This needs a content review API key."
        />
        <Panel>
          <Box as="form" className="review-key-form" onSubmit={saveKey}>
            <Field label="Review API key" icon={KeyRound}>
              <TextInput
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
          </Box>
        </Panel>
      </Page>
    );
  }

  const copy = STATUS_COPY[status];
  return (
    <Page>
      <PageHeader
        eyebrow="Content review"
        title="Review queue"
        lede="New items from content sources land here as pending review, and so do published questions that learners keep flagging. Publishing is what grows the question bank."
      />

      <CurriculumReview apiKey={apiKey} />

      <Tabs
        variant="section"
        ariaLabel="Content status"
        options={STATUS_TABS}
        value={status}
        onChange={(next: ReviewStatus) => { setStatus(next); setItems(null); }}
      />

      <Box className="review-toolbar">
        <Text variant="muted">
          {loading ? 'Loading…' : items ? copy.count(items.length) : ''}
        </Text>
        <Box className="review-actions">
          <Button variant="text" icon={RefreshCw} iconSize={16} onClick={() => load(apiKey, status)} disabled={loading}>
            Refresh
          </Button>
          <Button variant="text" onClick={clearKey}>
            Remove key
          </Button>
        </Box>
      </Box>

      {status === 'published' && items && items.length > 0 && (
        <Text variant="muted">Rejecting a published item takes it offline for learners immediately.</Text>
      )}

      {error && <ErrorMessage message={error} />}

      {items && items.length === 0 && !loading && (
        <EmptyState icon={CheckCircle2} title={copy.emptyTitle} text={copy.emptyText} />
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
    </Page>
  );
}

function ReviewItem({ item, note, busy, error, onNote, onAct }: ReviewItemProps) {
  const choices = normalizeChoices(item.choices);
  const expected = safeText(item.expected);
  const expectedPoints: string[] = Array.isArray(item.expected_points)
    ? item.expected_points.filter((point): point is string => typeof point === 'string')
    : [];
  const flagged = (item.report_count || 0) > 0;
  const isCorrectChoice = (choice: NormalizedChoice) => {
    if (!expected) return false;
    const target = expected.trim().toLowerCase();
    return choice.key.trim().toLowerCase() === target || choice.text.trim().toLowerCase() === target;
  };

  return (
    <Panel>
      <Box as="article" className="review-item">
        <Box className="review-pills">
          <Box as="span" className="review-pill">{formatEnum(item.type) || 'Item'}</Box>
          {item.level && <Box as="span" className="review-pill">{item.level}</Box>}
          {item.source && <Box as="span" className="review-pill">{item.source}</Box>}
          {item.external_id && <Box as="span" className="review-pill">{item.external_id}</Box>}
          {flagged && (
            <Box as="span" className="review-pill flagged">
              <Flag size={12} aria-hidden="true" />
              {item.report_count} learner report{item.report_count === 1 ? '' : 's'}
            </Box>
          )}
        </Box>

        {item.title && <Text as="h3">{item.title}</Text>}
        <Text as="p" className="review-prompt">{safeText(item.prompt)}</Text>
        {item.context && safeText(item.context) !== safeText(item.prompt) && (
          <Text variant="muted">{safeText(item.context)}</Text>
        )}
        {item.instructions && <Text variant="muted">{safeText(item.instructions)}</Text>}

        {(choices.length > 0 || expected || expectedPoints.length > 0) && (
          <Box className="review-expected">
            <Text as="strong">Answer / expected</Text>
            {choices.length > 0 && (
              <Box as="ul" className="review-choices">
                {choices.map((choice: NormalizedChoice) => (
                  <Box as="li" key={choice.key} className={isCorrectChoice(choice) ? 'correct' : undefined}>
                    {choice.key}. {choice.text}
                    {isCorrectChoice(choice) ? ' ✓' : ''}
                  </Box>
                ))}
              </Box>
            )}
            {expected && choices.length === 0 && <Text as="p">{expected}</Text>}
            {expectedPoints.length > 0 && (
              <Box as="ul" className="review-choices">
                {expectedPoints.map((point) => (
                  <Box as="li" key={point}>{point}</Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* TextInput drops maxLength by design; the 500-char cap is enforced in act(). */}
        <TextInput
          className="review-note"
          type="text"
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Reviewer note (optional, saved with the decision)"
          aria-label="Reviewer note"
        />

        {error && <ErrorMessage message={error} />}

        <Box className="review-item-actions">
          {item.status === 'pending_review' && (
            <Button variant="text" icon={Check} iconSize={16} disabled={busy} onClick={() => onAct('approve')}>
              Approve
            </Button>
          )}
          {item.status !== 'published' && (
            <Button variant="primary" icon={Send} iconSize={16} disabled={busy} onClick={() => onAct('publish')}>
              Publish
            </Button>
          )}
          <Box
            as="button"
            type="button"
            className="text-button review-danger"
            disabled={busy}
            onClick={() => onAct('reject')}
          >
            <X size={16} aria-hidden="true" /> Reject
          </Box>
        </Box>
      </Box>
    </Panel>
  );
}
