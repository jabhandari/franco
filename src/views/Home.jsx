import React from 'react';
import { ChevronRight, Plus, TrendingUp, ClipboardCheck, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { Banner, Button, EmptyState, Panel, PanelHeader, ProfileRows, RecordCount, Text } from '../components/ui';

export function Home({ userData, onStart, onPlacement }) {
  const profile = userData?.profile;
  const progressCount = userData?.progress?.length || 0;
  const mistakeCount = userData?.mistakes?.length || 0;
  const { data: contentData } = useApiResource('/api/content/sections');
  const contentCount = contentData?.sections?.reduce((sum, section) => sum + section.example_count, 0) || 0;
  const placementDone = profile?.placement_status === 'complete';

  return (
    <section className="home-grid">
      <div className="daily-panel">
        <div className="daily-art" aria-hidden="true">
          <span>franco</span>
          <strong>Bonjour, {userData?.user?.name?.split(' ')[0] || 'learner'}</strong>
        </div>
        <Text variant="eyebrow">Today's French</Text>
        <h1>Your daily French session starts here.</h1>
        <Text variant="lede">
          Practice with French examples and exercises matched to your level.
        </Text>
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
      </div>

      <div className="stack">
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
      </div>
    </section>
  );
}
