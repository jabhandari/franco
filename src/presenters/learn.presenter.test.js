// Unit checks for the FRA-47 learn presenter.
import {
  SKILL_TABS,
  SKILL_ITEM_TYPES,
  skillForItemType,
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

// Every skill tab maps to at least one item type; no type maps to two tabs.
{
  const allTypes = Object.values(SKILL_ITEM_TYPES).flat();
  assert(allTypes.length > 0, 'SKILL_ITEM_TYPES: tabs map to item types');
  assert(new Set(allTypes).size === allTypes.length, 'SKILL_ITEM_TYPES: no item type maps to two tabs');
}

assert(skillForItemType('dictation') === 'ecouter', "skillForItemType: dictation -> ecouter");
assert(skillForItemType('pronunciation_drill') === 'ecouter', "skillForItemType: pronunciation_drill -> ecouter");
assert(skillForItemType('reading') === 'lire', "skillForItemType: reading -> lire");
assert(skillForItemType('multiple_choice') === 'lire', "skillForItemType: multiple_choice -> lire");
assert(skillForItemType('writing_prompt') === 'ecrire', "skillForItemType: writing_prompt -> ecrire");
assert(skillForItemType('word_order') === 'ecrire', "skillForItemType: word_order -> ecrire");
assert(skillForItemType('speaking_prompt') === 'parler', "skillForItemType: speaking_prompt -> parler");
assert(skillForItemType('unknown_future_type') === null, 'skillForItemType: unknown types return null');
assert(skillForItemType(null) === null, 'skillForItemType: null-safe');

assert(
  countsForSkill({ dictation: 5, pronunciation_drill: 3, reading: 7 }, 'ecouter') === 8,
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
