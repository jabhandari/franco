import React from 'react';
import { ChevronRight, Plus, TrendingUp, ClipboardCheck, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { Banner as BannerJsx, Box as BoxJsx, Button as ButtonJsx, EmptyState as EmptyStateJsx, Panel as PanelJsx, PanelHeader as PanelHeaderJsx, ProfileRows as ProfileRowsJsx, RecordCount as RecordCountJsx, StreakHero as StreakHeroJsx, Text as TextJsx } from '../components/ui';

// FRA-66 interim bridge: src/components/ui/ is still .jsx (typed by FRA-63),
// and tsc infers required-any props from allowJs sources. Each import is
// pinned to the minimal prop subset this view passes, so JSX is checked
// against real props instead of the inferred ones.
// Justification: proper component typing is impossible until FRA-63 ships
// real prop types for src/components/ui — delete this block then. Box's
// props vary too widely for a minimal interface, so it bridges as
// ComponentType<Record<string, unknown>>.
interface BannerProps {
  icon?: React.ElementType;
  iconSize?: number;
  title?: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}
interface ButtonProps {
  variant?: string;
  wide?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
  iconSize?: number;
  iconPosition?: string;
  children?: React.ReactNode;
}
interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  text?: string;
}
interface PanelProps {
  compact?: boolean;
  children?: React.ReactNode;
}
interface PanelHeaderProps {
  eyebrow?: string;
  title?: string;
  aside?: React.ReactNode;
}
interface ProfileRowsProps {
  profile?: LearnerProfile | null;
}
interface RecordCountProps {
  count?: number;
  label?: string;
}
interface StreakHeroProps {
  streak?: StreakSummary | null;
}
interface TextProps {
  as?: string;
  variant?: string;
  size?: string;
  children?: React.ReactNode;
}
const Banner = BannerJsx as React.ComponentType<BannerProps>;
const Box = BoxJsx as React.ComponentType<Record<string, unknown>>;
const Button = ButtonJsx as React.ComponentType<ButtonProps>;
const EmptyState = EmptyStateJsx as React.ComponentType<EmptyStateProps>;
const Panel = PanelJsx as React.ComponentType<PanelProps>;
const PanelHeader = PanelHeaderJsx as React.ComponentType<PanelHeaderProps>;
const ProfileRows = ProfileRowsJsx as React.ComponentType<ProfileRowsProps>;
const RecordCount = RecordCountJsx as React.ComponentType<RecordCountProps>;
const StreakHero = StreakHeroJsx as React.ComponentType<StreakHeroProps>;
const Text = TextJsx as React.ComponentType<TextProps>;

// --- Local interfaces (FRA-66; for FRA-68: centralize into shared API types) ---

/** The learner profile row behind `userData.profile`; shape owned by main.jsx's read model. */
interface LearnerProfile {
  placement_status?: string | null;
  [key: string]: unknown;
}

/** Aggregate passed from the app shell (GET /api/me aggregate in main.jsx). */
interface HomeUserData {
  user?: { name?: string | null } | null;
  profile?: LearnerProfile | null;
  progress?: unknown[];
  mistakes?: unknown[];
}

/** Streak read model from GET /api/me/streak (consumed by StreakHero). */
interface StreakSummary {
  currentStreak?: number | null;
  [key: string]: unknown;
}

/** GET /api/content/sections — CEFR sections with example counts. */
interface ContentSectionsResponse {
  sections?: Array<{ example_count?: number | string | null }>;
}

interface HomeProps {
  userData?: HomeUserData | null;
  streak?: StreakSummary | null;
  onStart: () => void;
  onPlacement: () => void;
}

export function Home({ userData, streak, onStart, onPlacement }: HomeProps) {
  const profile = userData?.profile;
  const progressCount = userData?.progress?.length || 0;
  const mistakeCount = userData?.mistakes?.length || 0;
  const { data: contentData } = useApiResource('/api/content/sections');
  // Justification: useApiResource is still untyped .js (typed by FRA-65);
  // the GET /api/content/sections shape can't be expressed at the boundary
  // until then, so the locally declared ContentSectionsResponse is asserted.
  const sections: ContentSectionsResponse['sections'] =
    (contentData as ContentSectionsResponse | null)?.sections;
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
            <RecordCount count={progressCount} label="progress rows loaded" />
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
