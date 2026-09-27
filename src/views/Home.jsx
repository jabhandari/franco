import React from 'react';
import { ChevronRight, Plus, TrendingUp, ClipboardCheck } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { EmptyState, PanelHeading, ProfileRows, RecordCount } from '../components/ui.jsx';

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
        <p className="eyebrow">Today's French</p>
        <h1>Your daily French session starts here.</h1>
        <p className="lede">
          Practice with French examples and exercises matched to your level.
        </p>
        {!placementDone && (
          <div className="placement-banner">
            <ClipboardCheck size={18} aria-hidden="true" />
            <div>
              <strong>Take the 2-minute placement quiz</strong>
              <p>We’ll set your starting level so sessions match you.</p>
            </div>
            <button className="primary-button" onClick={onPlacement}>Start placement</button>
          </div>
        )}
        <button className="primary-button wide" onClick={onStart}>
          Start a 10-minute session <ChevronRight size={18} />
        </button>
      </div>

      <div className="stack">
        <section className="panel compact">
          <PanelHeading title="Level strength" />
          {progressCount ? (
            <RecordCount count={progressCount} label="progress rows loaded" />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No progress records"
              text="Complete a few exercises to start building your skill profile."
            />
          )}
        </section>
        <section className="panel compact">
          <PanelHeading title="Mistake recycling" />
          {mistakeCount ? (
            <RecordCount count={mistakeCount} label="mistakes loaded" />
          ) : (
            <EmptyState
              icon={Plus}
              title="No mistakes records"
              text="Mistakes you make while practicing will appear here for review."
            />
          )}
        </section>
        <section className="panel compact">
          <PanelHeading title="Learner profile" />
          <ProfileRows profile={profile} />
          <p className="muted small">{contentCount ? `${contentCount.toLocaleString()} legacy examples in the catalogue` : ''}</p>
        </section>
      </div>
    </section>
  );
}
