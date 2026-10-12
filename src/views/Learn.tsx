import React from 'react';
import { BookOpen, ChevronLeft, Headphones, Mic2, PenLine, Play, BookText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { CEFR_LEVELS, CLB_BY_CEFR } from '../presenters/levels.presenter.js';
import {
  SKILL_TABS,
  SKILL_ITEM_TYPES,
  skillForItemType,
  countsForSkill,
  levelMastery,
  type LevelMasterySummary,
  type SkillId,
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
const SKILL_PAGE_SIZE = 8;
const ITEM_TYPES_BY_SKILL: Record<string, string[]> = SKILL_ITEM_TYPES;
const SKILL_ICONS: Record<SkillId, LucideIcon> = {
  ecouter: Headphones,
  lire: BookText,
  ecrire: PenLine,
  parler: Mic2,
};

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
            <Box className="learn-card-copy">
              <Text as="strong" className="learn-card-level">{level}</Text>
              <Text className="learn-card-subtitle">{CLB_BY_CEFR[level] || 'CEFR level'}</Text>
              <Text className="learn-card-count">{total} {total === 1 ? 'activity' : 'activities'}</Text>
            </Box>
            <ProgressRing
              size={64}
              percent={Math.round(levelMasterySummary.avgMastery * 100)}
              label={`${level} mastery: ${levelMasterySummary.mastered} of ${levelMasterySummary.total} concepts mastered`}
            />
          </Card>
        );
      })}
    </Box>
  );
}

type SkillItemsProps = {
  key?: React.Key;
  level: CefrLevel;
  skill: string;
  token: string | null;
};

function SkillItems({ level, skill, token }: SkillItemsProps) {
  const [page, setPage] = React.useState(0);
  const types = ITEM_TYPES_BY_SKILL[skill] || [];
  const path = `/api/content/v1/items?level=${level}&types=${types.join(',')}&limit=${SKILL_PAGE_SIZE}&offset=${page * SKILL_PAGE_SIZE}`;
  const { data, loading, error } = useApiResource<ContentItemsResponse>(path, token);
  const items = (data?.items || []).filter((item) => skillForItemType(item.type) === skill);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / SKILL_PAGE_SIZE));
  const tab = SKILL_TABS.find((t) => t.id === skill);

  React.useEffect(() => {
    if (!loading && data && page > 0 && items.length === 0 && total > 0) setPage(pageCount - 1);
  }, [data, items.length, loading, page, pageCount, total]);

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
    <Box>
      <Box className={skill === 'ecouter' ? 'learn-activity-grid' : 'learn-activity-list'}>
        {items.map((item, index) => (
          <ExerciseCard key={item.id} entry={{ ...item, item_kind: 'content_item', media: toRendererMedia(item.media) }} token={token} compactListening sequence={page * SKILL_PAGE_SIZE + index + 1} />
        ))}
      </Box>
      {pageCount > 1 && (
        <Box className="learn-page-controls">
          <Button variant="text" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Text>Page {page + 1} of {pageCount} · {total} activities</Text>
          <Button variant="text" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Box>
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
  const selectedTab = SKILL_TABS.find((tab) => tab.id === skill);
  const selectedCount = countsForSkill(byType, skill);

  return (
    <Box className="learn-level-detail">
      <Box className="learn-back">
        <Button variant="text" onClick={onBack} icon={ChevronLeft} iconSize={16}>
          Back to levels
        </Button>
      </Box>
      <Box className="learn-level-hero">
        <Box className="learn-level-copy">
          <Text as="span" className="learn-level-kicker">LEVEL {level}{CLB_BY_CEFR[level] ? `  ·  ${CLB_BY_CEFR[level]}` : ''}</Text>
          <Text as="h1">Your {level} practice space.</Text>
          <Text>Pick a skill, try a short activity, and build momentum one step at a time.</Text>
        </Box>
        <Box className="learn-hero-action">
          <Text as="strong">{countsLoading ? '…' : total}</Text>
          <Text>{total === 1 ? 'activity' : 'activities'} to explore</Text>
          <Button variant="primary" onClick={() => onQuiz(level)} icon={Play} iconSize={16}>Start {level} quiz</Button>
        </Box>
      </Box>
      {countsError && <ErrorMessage message={countsError} />}
      <Box className="learn-section-intro">
        <Text as="span">01 / CHOOSE YOUR SKILL</Text>
        <Text as="h2">What would you like to work on?</Text>
      </Box>
      <Tabs
        variant="learnSkill"
        options={SKILL_TABS.map((tab) => ({
          id: tab.id,
          icon: SKILL_ICONS[tab.id],
          label: (
            <>
              <Text as="strong">{tab.label}</Text>
              <Text as="small">{countsLoading ? '…' : countsForSkill(byType, tab.id)} activities</Text>
            </>
          ),
        }))}
        value={skill}
        onChange={setSkill}
        ariaLabel={`Choose a ${level} skill`}
      />
      <Box className="learn-skill-content">
        <Box className="learn-list-heading">
          <Box>
            <Text as="span">02 / PRACTISE</Text>
            <Text as="h2">{selectedTab?.gloss} activities</Text>
            {skill === 'ecouter' && <Text className="learn-list-instruction">Play a sound, say what you hear, then reveal the word.</Text>}
          </Box>
          <Text>{countsLoading ? 'Loading count…' : `${selectedCount} available`}</Text>
        </Box>
        {skill in SKILL_ITEM_TYPES && (
          <SkillItems key={`${level}-${skill}`} level={level} skill={skill} token={token} />
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
        {!selectedLevel && (
          <Box className="learn-overview-intro">
            <Text as="span">YOUR LEARNING PATH</Text>
            <Text as="h1">Find your next step in French.</Text>
            <Text>Choose a level, then follow your curiosity through listening, reading, writing, and speaking.</Text>
          </Box>
        )}
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
