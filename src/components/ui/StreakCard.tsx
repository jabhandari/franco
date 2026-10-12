import React from 'react';
import { Flame } from 'lucide-react';
import type { StreakPayload } from './Streak';

export function StreakCard({ streak }: { streak?: StreakPayload | null }) {
  const days=Math.max(0,Number(streak?.currentStreak) || 0);
  const best=Math.max(0,Number(streak?.longestStreak) || 0);
  return (
    <section className="streak-card" aria-label="Daily streak">
      <Flame size={30} aria-hidden="true" />
      <div><strong>{streak ? days : '—'}</strong><span>day streak</span></div>
      <small>{streak ? `Best: ${best} day${best===1 ? '' : 's'}` : 'Streak unavailable'}</small>
      {streak && days===0 && <small>Study today to begin.</small>}
    </section>
  );
}
