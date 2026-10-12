import React from 'react';
import { ChevronRight, Plus, TrendingUp, ClipboardCheck, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import type { UserPayload, ConceptProgress } from '../types.js';
import type { RecentMistake } from '../api/client.js';
import { Banner as BannerJsx, Box as BoxJsx, Button as ButtonJsx, EmptyState as EmptyStateJsx, Panel as PanelJsx, PanelHeader as PanelHeaderJsx, ProfileRows as ProfileRowsJsx, RecordCount as RecordCountJsx, StreakHero as StreakHeroJsx, Text as TextJsx } from '../components/ui';

// FRA-66 interim bridge: src/components/ui/ is still .jsx (typed by FRA-63),
// so these imports carry no prop types. Each is pinned to the minimal prop
// subset this view passes via an explicit annotation (no `as`) so JSX is
// checked against real props instead of the inferred ones.
// Justification: proper component typing is impossible until FRA-63 ships
// real prop types for src/components/ui — delete this block then. Box's
// props vary too widely for a minimal interface, so it bridges on the
// per-view prop subset only.
type BannerProps = {
  icon?: React.ElementType;
  iconSize?: number;
  title?: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
};
type BoxProps = {
  as?: string;
  className?: string;
  children?: React.ReactNode;
  'aria-hidden'?: boolean | 'true' | 'false';
};
type ButtonProps = {
  variant?: string;
  wide?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
  iconSize?: number;
  iconPosition?: string;
  children?: React.ReactNode;
};
type EmptyStateProps = {
  icon?: React.ElementType;
  title?: string;
  text?: string;
};
type PanelProps = {
  compact?: boolean;
  children?: React.ReactNode;
};
type PanelHeaderProps = {
  eyebrow?: string;
  title?: string;
  aside?: React.ReactNode;
};
type ProfileRowsProps = {
  profile?: LearnerProfile | null;
};
type RecordCountProps = {
  count?: number;
  label?: string;
};
type StreakHeroProps = {
  streak?: StreakSummary | null;
};
type TextProps = {
  as?: string;
  variant?: string;
  size?: string;
  children?: React.ReactNode;
};
const Banner: React.ComponentType<BannerProps> = BannerJsx;
const Box: React.ComponentType<BoxProps> = BoxJsx;
const Button: React.ComponentType<ButtonProps> = ButtonJsx;
const EmptyState: React.ComponentType<EmptyStateProps> = EmptyStateJsx;
const Panel: React.ComponentType<PanelProps> = PanelJsx;
const PanelHeader: React.ComponentType<PanelHeaderProps> = PanelHeaderJsx;
const ProfileRows: React.ComponentType<ProfileRowsProps> = ProfileRowsJsx;
const RecordCount: React.ComponentType<RecordCountProps> = RecordCountJsx;
const StreakHero: React.ComponentType<StreakHeroProps> = StreakHeroJsx;
const Text: React.ComponentType<TextProps> = TextJsx;

// --- Local types (FRA-66; for FRA-68: centralize into shared API types) ---

/** learner_profiles row behind `userData.profile` (GET /api/me). */
type LearnerProfile = {
  user_id?: string;
  current_level?: string | null;
  learning_goal?: string | null;
  placement_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * GET /api/me learner aggregate; auth responses carry empty initial arrays.
 */
type HomeUserData = {
  user?: UserPayload | null;
  profile?: LearnerProfile | null;
  progress?: ConceptProgress[];
  mistakes?: RecentMistake[];
};

/** One day in the streak activity window (server/streak.js summarizeActivity). */
type StreakDay = {
  date: string;
  attempts: number;
};

/** Streak read model from GET /api/me/streak (consumed by StreakHero). */
type StreakSummary = {
  currentStreak?: number | null;
  longestStreak?: number | null;
  studiedToday?: boolean;
  activeDays?: number;
  totalAttempts?: number;
  today?: string;
  days?: StreakDay[];
};

/**
 * One row of GET /api/content/sections. node-postgres returns COUNT(*)
 * and AVG() aggregates as strings, so counts accept both.
 */
type ContentSectionRow = {
  section: string;
  example_count: number | string;
  exercise_count?: number | string | null;
  average_tokens?: number | string | null;
};

/** GET /api/content/sections response. */
type ContentSectionsResponse = {
  source?: {
    name?: string | null;
    url?: string | null;
    license?: string | null;
    attribution?: string | null;
    imported_at?: string;
  } | null;
  sections?: ContentSectionRow[];
  note?: string;
};

type HomeProps = {
  userData?: HomeUserData | null;
  streak?: StreakSummary | null;
  onStart: () => void;
  onPlacement: () => void;
};

export function Home({ userData, streak, onStart, onPlacement }: HomeProps) {
  const profile = userData?.profile;
  const progressCount = userData?.progress?.filter(concept => concept.state !== 'not_started').length || 0;
  const mistakeCount = userData?.mistakes?.length || 0;
  const { data: contentData } = useApiResource('/api/content/sections');
  // useApiResource is still untyped .js (typed by FRA-65); the response
  // shape is captured by annotation (no `as`) at the boundary.
  const sectionsData: ContentSectionsResponse | null = contentData;
  const sections = sectionsData?.sections;
  const contentCount = sections?.reduce((sum, section) => sum + Number(section.example_count || 0), 0) || 0;
  const placementDone = profile?.placement_status === 'complete';

  return (
    <Box as="section" className="home-grid">
      <Box className="daily-panel">
        <Box className="daily-art" aria-hidden="true">
          <Text as="span">franco</Text>
          <Text as="strong">Bonjour, {userData?.user?.name?.split(' ')[0] || 'learner'}</Text>
        </Box>
        <Text variant="eyebrow">Today's French</Text>
        <Text as="h1">Your daily French session starts here.</Text>
        <Text variant="lede">
          Practice with French examples and exercises matched to your level.
        </Text>
        <StreakHero streak={streak} />
        {!placementDone && (
          <Banner
            icon={ClipboardCheck}
            iconSize={18}
            title="Take the 2-minute placement quiz"
            text="We’ll set your starting level so sessions match you."
            actionLabel="Start placement"
            onAction={onPlacement}
          />
        )}
        <Button variant="primary" wide onClick={onStart} icon={ChevronRight} iconSize={18} iconPosition="after">
          Start a 10-minute session{' '}
        </Button>
      </Box>

      <Box className="stack">
        <Panel compact>
          <PanelHeader eyebrow="Your learning" title="Level strength" aside={<Database size={20} aria-hidden="true" />} />
          {progressCount ? (
            <RecordCount count={progressCount} label="concepts practiced" />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No progress records"
              text="Complete a few exercises to start building your skill profile."
            />
          )}
        </Panel>
        <Panel compact>
          <PanelHeader eyebrow="Your learning" title="Mistake recycling" aside={<Database size={20} aria-hidden="true" />} />
          {mistakeCount ? (
            <RecordCount count={mistakeCount} label="mistakes loaded" />
          ) : (
            <EmptyState
              icon={Plus}
              title="No mistakes records"
              text="Mistakes you make while practicing will appear here for review."
            />
          )}
        </Panel>
        <Panel compact>
          <PanelHeader eyebrow="Your learning" title="Learner profile" aside={<Database size={20} aria-hidden="true" />} />
          <ProfileRows profile={profile} />
          <Text variant="muted" size="sm">{contentCount ? `${contentCount.toLocaleString()} legacy examples in the catalogue` : ''}</Text>
        </Panel>
      </Box>
    </Box>
  );
}
