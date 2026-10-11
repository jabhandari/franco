// Pure logic for the per-CEFR-level concept breakdown table (FRA-48).
// Derives mastered / learning / locked status for each concept from the
// learner's concept mastery plus the prerequisite DAG. No React, no I/O.

export const MASTERED_THRESHOLD = 0.8;
export const WEAK_THRESHOLD = 0.4;

export const CONCEPT_STATUSES = ['mastered', 'learning', 'locked'];

export const STATUS_LABELS = {
  mastered: 'Mastered',
  learning: 'Learning',
  locked: 'Locked',
};

/**
 * Derive one concept's status.
 * - locked: any prerequisite is not yet mastered (missing mastery counts as 0)
 * - mastered: own mastery at/above threshold and prerequisites satisfied
 * - learning: unlocked but not yet mastered
 */
export function deriveStatus(mastery, prereqMasteries) {
  const prereqs = Array.isArray(prereqMasteries) ? prereqMasteries : [];
  const blocked = prereqs.some((m) => (m ?? 0) < MASTERED_THRESHOLD);
  if (blocked) return 'locked';
  if ((mastery ?? 0) >= MASTERED_THRESHOLD) return 'mastered';
  return 'learning';
}

/**
 * Build table rows for one level.
 * concepts: [{ id, slug, title, concept_type, level_code, description,
 *               prerequisites: [slug] }] (prerequisite slugs, as served by
 *             /api/content/v1/concepts)
 * masteryById: Map concept id -> mastery number (from learner_concept_mastery)
 */
export function buildConceptRows(concepts, masteryById) {
  const list = Array.isArray(concepts) ? concepts : [];
  const mastery = masteryById instanceof Map ? masteryById : new Map();
  const slugToId = new Map(list.map((c) => [c.slug, c.id]));
  return list.map((c) => {
    const own = mastery.get(c.id) ?? 0;
    const prereqMasteries = (c.prerequisites || []).map(
      (slug) => mastery.get(slugToId.get(slug)) ?? 0
    );
    return { ...c, mastery: own, status: deriveStatus(own, prereqMasteries) };
  });
}

/** Count rows per status for a level header / progress summary. */
export function summarizeStatuses(rows) {
  const summary = { mastered: 0, learning: 0, locked: 0 };
  for (const r of rows || []) {
    if (r && summary[r.status] !== undefined) summary[r.status] += 1;
  }
  return summary;
}

/**
 * Weak-spots filter (pairs with weakest-first scheduling): rows the learner
 * can actually work on right now - unlocked but not yet mastered. Locked rows
 * are excluded even with low mastery, since their prerequisites come first.
 */
export function filterWeakSpots(rows) {
  return (rows || []).filter((r) => r && r.status === 'learning');
}
