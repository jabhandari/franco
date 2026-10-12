import React from 'react';
import { BookOpen, ChevronLeft, Play } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { CEFR_LEVELS, CLB_BY_CEFR } from '../presenters/levels.presenter.js';
import {
  SKILL_TABS,
  SKILL_ITEM_TYPES,
  skillForItemType,
  countsForSkill,
  levelMastery,
  type LevelMasterySummary,
} from '../presenters/learn.presenter.js';
import type { CefrLevel } from '../types';
import type {
  ContentItemsResponse,
  ContentMediaAsset,
  ContentItemCountsForLevel,
  ContentItemCountsAll,
  ContentConceptsResponse,
  ProgressResponse,
} from '../api/client.js';
import type { MediaAsset } from '../components/exercises/Listening';
import { ExerciseCard } from '../components/exercises/ExerciseCard';
import {
  Box,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  LoadingSpinner,
  Page,
  PageHeader,
  ProgressRing,
  Text,
  Tabs,
} from '../components/ui';

// FRA-47: CEFR level-first navigation. Level cards carry a progress ring
// (mean concept mastery), real published-content counts, and CLB equivalents;
// each level view has the four skill tabs filtering content_items by
// cefr_level + item type, with per-cell counts and honest empty states.

// Media kinds the ingest schema allows. The API honestly types
// ContentMediaAsset.kind as string (stored rows are not re-validated —
// see src/api/client.ts), while ExerciseCard's renderers consume the
// narrow union, so narrow at runtime instead of asserting. Unknown kinds
// are dropped; renderers ignore them anyway (.find(m => m.kind === ...)).
const RENDERABLE_MEDIA_KINDS: ReadonlySet<string> = new Set(['audio', 'image', 'video', 'document']);

function isRenderableMediaKind(kind: string): kind is MediaAsset['kind'] {
  return RENDERABLE_MEDIA_KINDS.has(kind);
}

function toRendererMedia(media: ContentMediaAsset[]): MediaAsset[] {
  const out: MediaAsset[] = [];
  for (const m of media) {
    if (!isRenderableMediaKind(m.kind)) continue;
    out.push({
      kind: m.kind,
      url: m.url,
      duration_seconds: m.duration_seconds ?? undefined,
      transcript: m.transcript ?? undefined,
    });
  }
  return out;
}

type LevelCardsProps = {
  levels: CefrLevel[];
  countsByLevel: ContentItemCountsAll['counts'];
  mastery: Record<string, LevelMasterySummary> | null;
  onSelect: (level: CefrLevel) => void;
};

function LevelCards({ levels, countsByLevel, mastery, onSelect }: LevelCardsProps) {
  return (
    <Box className="learn-grid">
      {levels.map((level) => {
        const total = countsByLevel?.[level]?.total ?? 0;
        const levelMasterySummary = mastery?.[level] || { total: 0, mastered: 0, avgMastery: 0 };
        return (
          <Card
            key={level}
            onClick={() => onSelect(level)}
            ariaLabel={`${level}, ${CLB_BY_CEFR[level] ?? ''}, ${total} activities`}
          >
            <Text className="card-title">{level}</Text>
            {CLB_BY_CEFR[level] && <Text className="card-subtitle">{CLB_BY_CEFR[level]}</Text>}
            <ProgressRing
              percent={Math.round(levelMasterySummary.avgMastery * 100)}
              label={`${level} mastery: ${levelMasterySummary.mastered} of ${levelMasterySummary.total} concepts mastered`}
            />
            <Text className="card-meta">
              {total} {total === 1 ? 'activity' : 'activities'} · {levelMasterySummary.mastered}/{levelMasterySummary.total} concepts
            </Text>
          </Card>
        );
      })}
    </Box>
  );
}

type SkillItemsProps = {
  level: CefrLevel;
  skill: string;
  token: string | null;
};

function SkillItems({ level, skill, token }: SkillItemsProps) {
  const { data, loading, error } = useApiResource<ContentItemsResponse>(`/api/content/v1/items?level=${level}&limit=100`, token);
  const items = (data?.items || []).filter((item) => skillForItemType(item.type) === skill);
  const tab = SKILL_TABS.find((t) => t.id === skill);

  if (loading) return <LoadingSpinner label={`Loading ${tab?.label} activities…`} />;
  if (error) return <ErrorMessage message={error} />;
  if (!items.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title={`No ${tab?.label} activities yet`}
        text={`Coming soon — nothing is published for ${level} ${tab?.label.toLowerCase()} yet. Check back later.`}
      />
    );
  }

  return (
    <Box className="stack">
      {items.map((item) => (
        <ExerciseCard key={item.id} entry={{ ...item, item_kind: 'content_item', media: toRendererMedia(item.media) }} token={token} />
      ))}
      {(data?.items?.length ?? 0) >= 100 && (
        <Text variant="muted">Showing the first 100 {level} activities.</Text>
      )}
    </Box>
  );
}

type LevelDetailProps = {
  level: CefrLevel;
  token: string | null;
  onBack: () => void;
  onQuiz: (level: CefrLevel) => void;
};

function LevelDetail({ level, token, onBack, onQuiz }: LevelDetailProps) {
  const [skill, setSkill] = React.useState('ecouter');
  const { data: countsData, loading: countsLoading, error: countsError } = useApiResource<ContentItemCountsForLevel>(
    `/api/content/v1/item-counts?level=${level}`,
    token
  );
  const byType = countsData?.byType || {};
  const total = countsData?.total ?? 0;

  return (
    <Box>
      <Box className="learn-back">
        <Button variant="text" onClick={onBack} icon={ChevronLeft} iconSize={16}>
          All levels
        </Button>
      </Box>
      <Box className="learn-detail-head">
        <Box>
          <Text variant="eyebrow">{level}{CLB_BY_CEFR[level] ? ` · ${CLB_BY_CEFR[level]}` : ''}</Text>
          <Text as="h2">Learn {level}</Text>
        </Box>
        <Button variant="primary" onClick={() => onQuiz(level)} icon={Play} iconSize={16}>
          Start {level} quiz
        </Button>
      </Box>
      {countsError && <ErrorMessage message={countsError} />}
      <Tabs
        variant="section"
        options={SKILL_TABS.map((tab) => ({
          id: tab.id,
          label: (
            <>
              {tab.label}
              <Text className="skill-tab-count">
                {countsLoading ? '…' : countsForSkill(byType, tab.id)}
              </Text>
            </>
          ),
        }))}
        value={skill}
        onChange={setSkill}
        ariaLabel={`Choose a ${level} skill`}
      />
      <Box className="learn-skill-content">
      {skill in SKILL_ITEM_TYPES && (
        <SkillItems level={level} skill={skill} token={token} />
      )}
      </Box>
      {!countsLoading && total === 0 && (
        <Text variant="muted">No published activities at {level} yet — the counts above will fill in as content ships.</Text>
      )}
    </Box>
  );
}

export type LearnProps = {
  token: string | null;
  onQuiz: (level: CefrLevel) => void;
  key?: React.Key;
};

export function Learn({ token, onQuiz }: LearnProps) {
  const [selectedLevel, setSelectedLevel] = React.useState<CefrLevel | null>(null);
  const { data: countsData } = useApiResource<ContentItemCountsAll>('/api/content/v1/item-counts', token);
  const { data: conceptsData, loading: conceptsLoading, error: conceptsError } = useApiResource<ContentConceptsResponse>(
    '/api/content/v1/concepts',
    token
  );
  const { data: progressData, loading: progressLoading } = useApiResource<ProgressResponse>('/api/me/progress', token);

  const mastery = React.useMemo(
    () => levelMastery(conceptsData?.concepts, progressData?.concepts, CEFR_LEVELS),
    [conceptsData, progressData]
  );
  const countsByLevel = React.useMemo<ContentItemCountsAll['counts']>(() => {
    const byLevel: ContentItemCountsAll['counts'] = {};
    for (const level of CEFR_LEVELS) byLevel[level] = { total: 0, byType: {} };
    for (const [level, entry] of Object.entries(countsData?.counts || {})) {
      byLevel[level] = { total: Number(entry.total) || 0, byType: entry.byType || {} };
    }
    return byLevel;
  }, [countsData]);

  return (
    <Page>
      <Box className="learn-view">
      <PageHeader
        eyebrow="Learn"
        title="Choose your level"
        lede="Levels first, skills second. Pick a CEFR level to see listening, reading, writing, and speaking activities — with real counts, so empty shelves say so."
      />
      {conceptsError && <ErrorMessage message={conceptsError} />}
      {(conceptsLoading || progressLoading) && (
        <LoadingSpinner label="Loading levels — pulling your progress and the content counts." />
      )}
      {!conceptsLoading && !progressLoading && !selectedLevel && (
        <LevelCards
          levels={CEFR_LEVELS}
          countsByLevel={countsByLevel}
          mastery={mastery}
          onSelect={setSelectedLevel}
        />
      )}
      {selectedLevel && (
        <LevelDetail
          level={selectedLevel}
          token={token}
          onBack={() => setSelectedLevel(null)}
          onQuiz={onQuiz}
        />
      )}
      </Box>
    </Page>
  );
}
