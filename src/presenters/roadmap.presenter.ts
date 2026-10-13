import type { ContentConcept } from '../api/client';
import type { ConceptProgress } from '../types';

export type RoadmapState = 'completed' | 'in_progress' | 'up_next' | 'locked';

// A learner's existing work wins over prerequisite locks. Unknown progress
// stays unavailable instead of treating a failed request as a fresh learner.
export function lessonState(concept: ContentConcept, progress: ConceptProgress[] | null): RoadmapState {
  if (!progress) return 'locked';
  const own = progress.find(row => row.slug === concept.slug);
  if (own?.state === 'completed' || own?.state === 'in_progress') return own.state;
  const ready = concept.prerequisites.every(slug => progress.some(row => row.slug === slug && row.state === 'completed'));
  return ready ? 'up_next' : 'locked';
}

// Topological depth preserves the prerequisite branches at every level.
// Long rows wrap at four fixed-width cards, without scaling the canvas.
export function roadmapPositions(concepts: ContentConcept[]) {
  const bySlug = new Map(concepts.map(concept => [concept.slug, concept]));
  const depths = new Map<string, number>();
  function depth(slug: string, visiting: Set<string>): number {
    if (depths.has(slug)) return depths.get(slug) || 0;
    if (visiting.has(slug)) return 0;
    const next = new Set(visiting); next.add(slug);
    const parents = (bySlug.get(slug)?.prerequisites || []).filter(parent => bySlug.has(parent));
    const result = parents.length ? Math.max(...parents.map(parent => depth(parent, next))) + 1 : 0;
    depths.set(slug, result); return result;
  }
  for (const concept of concepts) depth(concept.slug, new Set());
  const positions = new Map<string, { row: number; column: number }>();
  let row = 1;
  const levels = [...new Set(depths.values())].sort((a,b) => a-b);
  for (const level of levels) {
    const group = concepts.filter(concept => depths.get(concept.slug) === level);
    for (let start = 0; start < group.length; start += 4) {
      const batch = group.slice(start, start + 4);
      batch.forEach((concept,index) => positions.set(concept.slug, {row,column:5-batch.length+index*2}));
      row++;
    }
  }
  return positions;
}
