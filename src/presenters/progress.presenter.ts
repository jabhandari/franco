import type { SkillId, SkillProgress, CefrLevel } from '../types';

// Shared completion math for Home's skill boxes and Practice's cards.
export function skillCompletion(rows: SkillProgress[], skill: SkillId, level?: CefrLevel) {
  const matching = rows.filter(row => row.skill === skill && (!level || row.level === level));
  const done = matching.reduce((count,row) => count + row.exercises_done,0);
  const total = matching.reduce((count,row) => count + row.exercises_total,0);
  return { done,total,percent:total ? Math.round(done/total*100) : 0 };
}
