// FRA-47 presenter: Learn view helpers (CEFR level-first navigation).
// Pure functions only — no JSX, no hooks, no side effects.

// The four skill tabs shown on each level view. Labels are French-first
// (the app teaches French); the English gloss is for screen-reader/aria use.
export const SKILL_TABS = [
  { id: 'ecouter', label: 'Écouter', gloss: 'Listening' },
  { id: 'lire', label: 'Lire', gloss: 'Reading' },
  { id: 'ecrire', label: 'Écrire', gloss: 'Writing' },
  { id: 'parler', label: 'Parler', gloss: 'Speaking' },
];

// content_items.item_type -> skill tab. Types not listed here (e.g. future
// types) don't map to a tab and are excluded from skill-filtered lists.
export const SKILL_ITEM_TYPES = {
  ecouter: ['listening', 'dictation', 'pronunciation_drill'],
  lire: ['reading', 'multiple_choice', 'grammar_focus'],
  ecrire: ['writing_prompt', 'spelling', 'cloze', 'free_text', 'word_order'],
  parler: ['speaking_prompt'],
};

// Reverse lookup: item type -> skill id, or null when the type has no tab.
const TYPE_TO_SKILL = Object.fromEntries(
  Object.entries(SKILL_ITEM_TYPES).flatMap(([skill, types]) =>
    types.map((type) => [type, skill])
  )
);

/**
 * Which skill tab a content item belongs to. Null-safe: unknown or
 * missing types return null so callers can exclude the item.
 * @param {*} itemType
 * @returns {string|null}
 */
export function skillForItemType(itemType) {
  if (typeof itemType !== 'string') return null;
  return TYPE_TO_SKILL[itemType.trim().toLowerCase()] ?? null;
}

/**
 * Total published items for one skill tab from the item-counts payload
 * ({ byType: { <item_type>: <count> } }). Never throws on missing data.
 * @param {*} byType
 * @param {string} skillId
 * @returns {number}
 */
export function countsForSkill(byType, skillId) {
  const types = SKILL_ITEM_TYPES[skillId];
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
 * Per-level mastery summary for the level cards' progress rings.
 * concepts: rows with { id, level_code }; masteryRows: learner_concept_mastery
 * rows with { concept_id, mastery }. Levels with no concepts report zeros —
 * callers render those cards as "not started", never as 100%.
 * @param {Array} concepts
 * @param {Array} masteryRows
 * @param {Array<string>} levels
 * @returns {Object<string, {total:number, mastered:number, avgMastery:number}>}
 */
export function levelMastery(concepts, masteryRows, levels) {
  const masteryByConcept = new Map();
  for (const row of Array.isArray(masteryRows) ? masteryRows : []) {
    if (row && row.concept_id != null) {
      masteryByConcept.set(row.concept_id, Number(row.mastery) || 0);
    }
  }
  const summary = {};
  for (const level of Array.isArray(levels) ? levels : []) {
    const atLevel = (Array.isArray(concepts) ? concepts : []).filter(
      (concept) => concept && concept.level_code === level
    );
    const mastered = atLevel.filter(
      (concept) => (masteryByConcept.get(concept.id) ?? 0) >= MASTERED_THRESHOLD
    ).length;
    const avgMastery = atLevel.length
      ? atLevel.reduce((sum, concept) => sum + (masteryByConcept.get(concept.id) ?? 0), 0) / atLevel.length
      : 0;
    summary[level] = { total: atLevel.length, mastered, avgMastery };
  }
  return summary;
}
