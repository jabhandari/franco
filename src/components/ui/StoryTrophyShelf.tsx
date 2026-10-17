import React from 'react';
import {Trophy} from 'lucide-react';
import type {StoryStop} from '../../types';
import {storyTrophyProgress} from '../../presenters/stories.presenter';
import {ProgressBar} from './ProgressBar';

export type StoryTrophyShelfProps = {
  stops: StoryStop[];
  key?: React.Key;
};

// Gold trophy shelf for the Stories hero: one medallion per level chapter,
// earned only when every story in that chapter is completed. Trophies are
// rewards, never gates — this component renders progress, nothing else.
export function StoryTrophyShelf({stops}: StoryTrophyShelfProps) {
  const progress = storyTrophyProgress(stops);
  const percent = progress.total ? (progress.completed / progress.total) * 100 : 0;
  return (
    <section className="story-shelf" aria-label="Trophy shelf">
      <div className="story-shelf-head">
        <span className="story-shelf-icon">
          <Trophy size={26} aria-hidden="true" />
        </span>
        <span className="story-shelf-copy">
          <small>Trophy shelf</small>
          <strong>
            {progress.earned} of {progress.chapters.length} trophies
          </strong>
        </span>
      </div>
      <div className="story-shelf-medals">
        {progress.chapters.map(chapter => (
          <span
            key={chapter.level}
            className={`story-medal${chapter.earned ? ' earned' : ''}`}
            role="img"
            aria-label={
              chapter.earned
                ? `${chapter.level} trophy earned`
                : `${chapter.level} trophy · ${chapter.completed} of ${chapter.total} stories completed`
            }
          >
            <Trophy size={17} aria-hidden="true" />
            <small>{chapter.level}</small>
          </span>
        ))}
      </div>
      <ProgressBar label="Stories completed" percent={percent} />
      <p className="story-shelf-note">
        {progress.completed} of {progress.total} stories completed
      </p>
    </section>
  );
}
