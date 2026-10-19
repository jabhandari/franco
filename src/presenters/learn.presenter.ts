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

// An exercise may train more than one skill (for example Listen & Repeat).
// Use this for tab inventories; the reverse lookup above only supplies a
// primary skill for single-skill callers.
export function itemBelongsToSkill(itemType: string | null | undefined, skill: SkillId): boolean {
  return typeof itemType === 'string' && SKILL_ITEM_TYPES[skill].includes(itemType.trim().toLowerCase());
}

// Practice requests only the selected skill's content types. The endpoint
// accepts a comma-separated types filter and paginates the filtered result.
export const PRACTICE_PAGE_SIZE = 40;
export function practiceItemsUrl(skill: SkillId, level: string, offset = 0, limit = PRACTICE_PAGE_SIZE): string {
  const types = encodeURIComponent(SKILL_ITEM_TYPES[skill].join(','));
  return `/api/content/v1/items?level=${encodeURIComponent(level)}&types=${types}&limit=${limit}&offset=${offset}`;
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

// Mockup A cards share the practice inventory helpers above.
import type { ContentConcept } from '../api/client';
import type { LearnTopicCard, LearnProgressRow, LearnJump, LearnSubtopic } from '../types';
import { CEFR_LEVELS, CLB_BY_CEFR } from './levels.presenter';
export const TOPIC_PALETTE = ['#0da49c','#3d9bd6','#e8a020','#f4604e','#8b6fd8','#3fae6a','#e5638f','#5a74d6','#d97036','#2a9d8f','#b565a7','#6a8f3f','#0e7fb5','#c98a1b','#7a5fc0','#3d9b78'];
export function topicColor(index:number):string { return TOPIC_PALETTE[((index % 16) + 16) % 16]; }
const ICONS:Record<string,string> = {
 'A1-01':'MessageCircle','A1-02':'ListOrdered','A1-03':'CircleUserRound','A1-04':'Tag','A1-05':'Bookmark','A1-06':'Copy','A1-07':'Clock','A1-08':'Zap','A1-09':'Palette','A1-10':'CircleMinus','A1-11':'HelpCircle','A1-12':'Coffee','A1-13':'Calendar','A1-14':'MapPin','A1-15':'MessageCircle',
 'A2-01':'Zap','A2-02':'Clock','A2-03':'Clock','A2-04':'ArrowRight','A2-05':'CircleUserRound','A2-06':'Users','A2-07':'ListOrdered','A2-08':'Clock','A2-09':'Bookmark','A2-10':'MapPin','A2-11':'HelpCircle','A2-12':'MessageCircle','A2-13':'Calendar','A2-14':'Heart','A2-15':'MessageCircle',
};
export function topicIcon(id:string):string { return ICONS[id] ?? 'BookOpen'; }
export function learnLevels() { const colours=['#0da49c','#50a8df','#d99b28','#f4604e','#9b80d8','#243b53']; return CEFR_LEVELS.map((id,index)=>({id,clb:`CLB ${CLB_BY_CEFR[id]}`,colour:colours[index]})); }
export function topicCards(concepts:ContentConcept[], rows:LearnProgressRow[], level:string):LearnTopicCard[] {
 return concepts.filter(c=>c.level_code===level).map((c,index)=>{
  const topicId=c.metadata.lesson?.topic_id ?? c.slug;
  const subtopics:LearnSubtopic[]=(c.metadata.subtopics ?? []).map(s=>({subtopicId:s.subtopic_id,title:s.title,state:rows.find(r=>r.topic_id===topicId && r.subtopic_id===s.subtopic_id)?.status ?? 'not_started'}));
  const doneCount=subtopics.filter(s=>s.state==='completed').length;
  return {slug:c.slug,topicId,title:c.title,description:c.description ?? '',subtopicCount:subtopics.length,doneCount,state:subtopics.length>0 && doneCount===subtopics.length?'completed':subtopics.some(s=>s.state!=='not_started')?'in_progress':'not_started',colour:topicColor(index),icon:topicIcon(topicId),subtopics};
 });
}
export function jumpBackIn(cards:LearnTopicCard[], rows:LearnProgressRow[]):LearnJump|null {
 for(const row of rows.filter(r=>r.status==='in_progress').sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))) {
  const card=cards.find(c=>c.topicId===row.topic_id); const sub=card?.subtopics.find(s=>s.subtopicId===row.subtopic_id);
  if(card && sub) return {topicTitle:card.title,subtopicTitle:sub.title,slug:card.slug,subtopicId:sub.subtopicId};
 } return null;
}
