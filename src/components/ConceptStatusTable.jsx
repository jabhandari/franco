import React from 'react';
import { ListFilter } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { CEFR_LEVELS } from '../presenters/levels.presenter.js';
import { safeText, humanize, padNumber } from '../presenters/format.presenter.js';
import {
  buildConceptRows,
  summarizeStatuses,
  filterWeakSpots,
  STATUS_LABELS,
} from '../presenters/concept-status.presenter.js';
import { ConceptDetail, toNode } from './concepts.jsx';
import {
  Box,
  Badge,
  Button,
  EmptyState,
  ErrorMessage,
  Modal,
  Panel,
  PanelHeader,
  Tabs,
  Text,
} from './ui';

// FRA-48: per-CEFR-level concept breakdown table, generated from the existing
// concept tree (never hand-written). Each row shows concept -> skill area ->
// status (mastered / learning / locked, derived from learner_concept_mastery
// plus the prerequisite DAG). Rows open the lesson detail modal, and the
// "weak spots" filter doubles as the weak-spots view for weakest-first
// scheduling. Composes ui primitives only (strict UI boundary).
export function ConceptStatusTable({ level = 'A1', onSelectLevel, token }) {
  const conceptsReq = useApiResource('/api/content/v1/concepts', token);
  const progressReq = useApiResource('/api/me/progress', token);
  const [weakOnly, setWeakOnly] = React.useState(false);
  const [activeSlug, setActiveSlug] = React.useState(null);

  const levelConcepts = React.useMemo(
    () => (conceptsReq.data?.concepts || []).filter((c) => c.level_code === level),
    [conceptsReq.data, level]
  );

  const masteryById = React.useMemo(() => {
    const map = new Map();
    for (const m of progressReq.data?.concepts || []) {
      if (m && m.concept_id) map.set(m.concept_id, m.mastery);
    }
    return map;
  }, [progressReq.data]);

  const rows = React.useMemo(
    () => buildConceptRows(levelConcepts, masteryById),
    [levelConcepts, masteryById]
  );
  const visibleRows = weakOnly ? filterWeakSpots(rows) : rows;
  const summary = React.useMemo(() => summarizeStatuses(rows), [rows]);
  const active = rows.find((r) => r.slug === activeSlug) || null;

  const loading = conceptsReq.loading || progressReq.loading;
  const error = conceptsReq.error || progressReq.error;

  return (
    <Panel>
      <PanelHeader
        eyebrow="Curriculum"
        title={`${level} concept breakdown`}
        action={
          <Button
            variant="secondary"
            active={weakOnly}
            icon={ListFilter}
            onClick={() => setWeakOnly((v) => !v)}
            aria-pressed={weakOnly}
          >
            Weak spots only
          </Button>
        }
      />
      <Tabs
        variant="roadmap"
        options={CEFR_LEVELS.map((l) => ({ id: l, label: l }))}
        value={level}
        onChange={onSelectLevel}
        ariaLabel="CEFR level"
      />
      <Box className="concept-status-summary">
        <Text as="span" variant="muted" size="sm">
          {summary.mastered} mastered · {summary.learning} learning · {summary.locked} locked
        </Text>
      </Box>
      {loading && <Text variant="muted">Loading concept table…</Text>}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && !rows.length && (
        <EmptyState
          title={`No concepts for ${level} yet`}
          text="Concepts appear here once the curriculum is seeded for this level."
        />
      )}
      {!loading && !error && rows.length > 0 && !visibleRows.length && (
        <EmptyState
          title="No weak spots"
          text="Nothing to review at this level - every unlocked concept is mastered."
        />
      )}
      {!loading && !error && visibleRows.length > 0 && (
        <Box className="concept-table" role="table" aria-label={`${level} concepts`}>
          <Box className="concept-table-head" role="row">
            <Text as="span" role="columnheader">Concept</Text>
            <Text as="span" role="columnheader">Skill</Text>
            <Text as="span" role="columnheader">Status</Text>
          </Box>
          {visibleRows.map((row, index) => (
            <Box
              as="button"
              type="button"
              role="row"
              className={`concept-table-row concept-table-row-${row.status}${activeSlug === row.slug ? ' active' : ''}`}
              key={row.id}
              onClick={() => setActiveSlug(activeSlug === row.slug ? null : row.slug)}
              aria-expanded={activeSlug === row.slug}
            >
              <Text as="span" role="cell">
                <Text as="b">{padNumber(index + 1)}</Text>
                {safeText(row.title)}
              </Text>
              <Text as="small" role="cell">{humanize(safeText(row.concept_type))}</Text>
              <Text as="span" role="cell">
                <Badge variant="status" kind={row.status}>
                  {STATUS_LABELS[row.status]}
                </Badge>
              </Text>
            </Box>
          ))}
        </Box>
      )}
      {active && (
        <Modal closeLabel="Close lesson" onClose={() => setActiveSlug(null)}>
          <ConceptDetail concept={toNode(active)} />
        </Modal>
      )}
    </Panel>
  );
}
