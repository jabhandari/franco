// FRA-47 presenter: Learn view helpers (CEFR level-first navigation).
// Pure functions only — no JSX, no hooks, no side effects.
import type { CefrLevel, SkillId } from '../types';
import type { LearnerConceptMastery } from '../api/client.js';
import { LEARNING_SKILL_ITEM_TYPES } from '../../shared/learning-skills.js';

/** Skill tab ids on the Learn level views. */
export type { SkillId } from '../types';

/** One skill tab: French-first label, English gloss for screen-reader/aria use. */
export type SkillTab = {
  id: SkillId;
  label: string;
  gloss: string;
};

// The four skill tabs shown on each level view. Labels are French-first
// (the app teaches French); the English gloss is for screen-reader/aria use.
export const SKILL_TABS: SkillTab[] = [
  { id: 'ecouter', label: 'Écouter', gloss: 'Listening' },
  { id: 'lire', label: 'Lire', gloss: 'Reading' },
  { id: 'ecrire', label: 'Écrire', gloss: 'Writing' },
  { id: 'parler', label: 'Parler', gloss: 'Speaking' },
];

// content_items.item_type -> skill tab. Types not listed here (e.g. future
// types) don't map to a tab and are excluded from skill-filtered lists.
export const SKILL_ITEM_TYPES: Record<SkillId, string[]> = {
  ...LEARNING_SKILL_ITEM_TYPES,
};

// Reverse lookup: item type -> skill id, or null when the type has no tab.
const TYPE_TO_SKILL: Record<string, SkillId> = {};
for (const tab of SKILL_TABS) {
  for (const type of SKILL_ITEM_TYPES[tab.id]) {
    TYPE_TO_SKILL[type] ??= tab.id;
  }
}

/**
 * Which skill tab a content item belongs to. Null-safe: unknown or
 * missing types return null so callers can exclude the item.
 */
export function skillForItemType(itemType: string | null | undefined): SkillId | null {
  if (typeof itemType !== 'string') return null;
  return TYPE_TO_SKILL[itemType.trim().toLowerCase()] ?? null;
}

/**
 * Item-counts payload from GET /api/content/v1/item-counts
 * ({ byType: { <item_type>: <count> } }).
 */
export type ItemCountsByType = Record<string, number>;

/**
 * Total published items for one skill tab from the item-counts payload.
 * Never throws on missing data.
 */
export function countsForSkill(
  byType: ItemCountsByType | null | undefined,
  skillId: string,
): number {
  // String-indexed view of the tab map: callers pass untrusted ids and
  // unknown ids count 0.
  const typesById: Record<string, string[]> = SKILL_ITEM_TYPES;
  const types = typesById[skillId];
  if (!Array.isArray(types)) return 0;
  const counts = byType && typeof byType === 'object' ? byType : {};
  return types.reduce((sum, type) => {
    const n = Number(counts[type]);
    return sum + (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  }, 0);
}

// Mastery >= this counts as "mastered" for level progress rings/cards.
// (Same threshold the concept-status presenter uses for its mastered state.)
export const MASTERED_THRESHOLD = 0.8;

/**
 * Concept row fields consumed by levelMastery
 * (subset of GET /api/content/v1/concepts).
 */
export type LearnConcept = {
  id: string;
  level_code: string | null;
};

/** Per-level mastery summary for the level cards' progress rings. */
export type LevelMasterySummary = {
  total: number;
  mastered: number;
  avgMastery: number;
};

/**
 * Per-level mastery summary for the level cards' progress rings.
 * concepts: rows with { id, level_code }; masteryRows: learner_concept_mastery
 * rows with { concept_id, mastery }. Levels with no concepts report zeros —
 * callers render those cards as "not started", never as 100%.
 */
export function levelMastery(
  concepts: LearnConcept[] | null | undefined,
  masteryRows: LearnerConceptMastery[] | null | undefined,
  levels: CefrLevel[] | null | undefined,
): Record<string, LevelMasterySummary> {
  const masteryByConcept = new Map<string, number>();
  for (const row of Array.isArray(masteryRows) ? masteryRows : []) {
    if (row && row.concept_id != null) {
      masteryByConcept.set(row.concept_id, Number(row.mastery) || 0);
    }
  }
  const summary: Record<string, LevelMasterySummary> = {};
  for (const level of Array.isArray(levels) ? levels : []) {
    const atLevel = (Array.isArray(concepts) ? concepts : []).filter(
      (concept) => concept && concept.level_code === level,
    );
    const mastered = atLevel.filter(
      (concept) => (masteryByConcept.get(concept.id) ?? 0) >= MASTERED_THRESHOLD,
    ).length;
    const avgMastery = atLevel.length
      ? atLevel.reduce((sum, concept) => sum + (masteryByConcept.get(concept.id) ?? 0), 0) / atLevel.length
      : 0;
    summary[level] = { total: atLevel.length, mastered, avgMastery };
  }
  return summary;
}
