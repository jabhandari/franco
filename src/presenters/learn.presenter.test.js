// Unit checks for the FRA-47 learn presenter.
import {
  SKILL_TABS,
  SKILL_ITEM_TYPES,
  skillForItemType,
  itemBelongsToSkill,
  practiceItemsUrl,
  countsForSkill,
  levelMastery,
  MASTERED_THRESHOLD,
} from './learn.presenter.ts';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

assert(
  SKILL_TABS.map((t) => t.id).join(',') === 'ecouter,lire,ecrire,parler',
  'SKILL_TABS: four skill tabs in Écouter/Lire/Écrire/Parler order'
);
assert(
  SKILL_TABS.every((t) => t.label && t.gloss),
  'SKILL_TABS: every tab has a French label and an English gloss'
);

// Listen & repeat builds both listening and speaking, so it appears in both tabs.
{
  const allTypes = Object.values(SKILL_ITEM_TYPES).flat();
  assert(allTypes.length > 0, 'SKILL_ITEM_TYPES: tabs map to item types');
  assert(allTypes.length - new Set(allTypes).size === 2, 'SKILL_ITEM_TYPES: listen_repeat and free_text span two tabs');
  assert(SKILL_ITEM_TYPES.ecouter.includes('listen_repeat') && SKILL_ITEM_TYPES.parler.includes('listen_repeat'), 'SKILL_ITEM_TYPES: listen_repeat spans listening and speaking');
}

assert(skillForItemType('listen_repeat') === 'ecouter', "skillForItemType: listen_repeat -> ecouter");
assert(skillForItemType('reading') === 'lire', "skillForItemType: reading -> lire");
assert(skillForItemType('multiple_choice') === 'lire', "skillForItemType: multiple_choice -> lire");
assert(skillForItemType('writing_prompt') === 'ecrire', "skillForItemType: writing_prompt -> ecrire");
assert(skillForItemType('word_order') === 'ecrire', "skillForItemType: word_order -> ecrire");
assert(skillForItemType('speaking_prompt') === 'parler', "skillForItemType: speaking_prompt -> parler");
assert(skillForItemType('unknown_future_type') === null, 'skillForItemType: unknown types return null');
assert(skillForItemType(null) === null, 'skillForItemType: null-safe');
assert(itemBelongsToSkill('listen_repeat', 'ecouter') && itemBelongsToSkill('listen_repeat', 'parler'), 'Listen & Repeat appears in Listening and Speaking inventories');
assert(itemBelongsToSkill('free_text', 'ecrire') && itemBelongsToSkill('free_text', 'parler'), 'Free Text appears in Writing and Speaking inventories');
assert(!itemBelongsToSkill('reading', 'parler') && !itemBelongsToSkill(null, 'parler'), 'Speaking excludes unrelated and missing types');
assert(practiceItemsUrl('parler', 'B1').includes('types=speaking_prompt%2Clisten_repeat%2Cfree_text&limit=40&offset=0'), 'Practice queries only Speaking types in a bounded first page');
assert(practiceItemsUrl('lire', 'B2', 40).endsWith('&limit=40&offset=40'), 'Practice can request the next page without reloading the level');

assert(
  countsForSkill({ listen_repeat: 8, reading: 7 }, 'ecouter') === 8,
  'countsForSkill: sums the skill tab\'s item types'
);
assert(countsForSkill({}, 'lire') === 0, 'countsForSkill: missing data -> 0');
assert(countsForSkill(null, 'ecouter') === 0, 'countsForSkill: null payload -> 0');
assert(countsForSkill({ reading: 4 }, 'nope') === 0, 'countsForSkill: unknown skill -> 0');

{
  const concepts = [
    { id: 'c1', level_code: 'A1' },
    { id: 'c2', level_code: 'A1' },
    { id: 'c3', level_code: 'B2' },
  ];
  const mastery = [
    { concept_id: 'c1', mastery: 0.9 },
    { concept_id: 'c2', mastery: 0.4 },
  ];
  const summary = levelMastery(concepts, mastery, ['A1', 'B2', 'C2']);
  assert(summary.A1.total === 2 && summary.A1.mastered === 1, 'levelMastery: A1 counts total + mastered');
  assert(Math.abs(summary.A1.avgMastery - 0.65) < 1e-9, 'levelMastery: A1 avgMastery is the mean (0.9+0.4)/2');
  assert(summary.B2.total === 1 && summary.B2.mastered === 0 && summary.B2.avgMastery === 0, 'levelMastery: B2 with no mastery rows -> zeros');
  assert(summary.C2.total === 0 && summary.C2.mastered === 0, 'levelMastery: empty level -> zeros, not 100%');
  assert(MASTERED_THRESHOLD === 0.8, 'MASTERED_THRESHOLD: 0.8');
}

console.log('learn.presenter checks passed');
