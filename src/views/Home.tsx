import React from 'react';
import { ChevronRight, Plus, TrendingUp, ClipboardCheck, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { Banner as BannerJsx, Box as BoxJsx, Button as ButtonJsx, EmptyState as EmptyStateJsx, Panel as PanelJsx, PanelHeader as PanelHeaderJsx, ProfileRows as ProfileRowsJsx, RecordCount as RecordCountJsx, StreakHero as StreakHeroJsx, Text as TextJsx } from '../components/ui';

// FRA-66 interim bridge: src/components/ui/ is still .jsx (typed by FRA-63),
// and tsc infers required-any props from allowJs sources. Cast to untyped
// components so JSX usage isn't checked against those inferred props.
// Delete this block once FRA-63 ships real component prop types.
const Banner: React.ComponentType<any> = BannerJsx;
const Box: React.ComponentType<any> = BoxJsx;
const Button: React.ComponentType<any> = ButtonJsx;
const EmptyState: React.ComponentType<any> = EmptyStateJsx;
const Panel: React.ComponentType<any> = PanelJsx;
const PanelHeader: React.ComponentType<any> = PanelHeaderJsx;
const ProfileRows: React.ComponentType<any> = ProfileRowsJsx;
const RecordCount: React.ComponentType<any> = RecordCountJsx;
const StreakHero: React.ComponentType<any> = StreakHeroJsx;
const Text: React.ComponentType<any> = TextJsx;

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
