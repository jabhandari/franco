import assert from 'node:assert/strict';
import { BOSS_ENCOUNTERS, EXPEDITION_LENGTH, comboMultiplier, expeditionAnswer, expeditionChoice, expeditionLevelOrder, freshExpeditionState, isBossEncounter, loupeRemovals, useProvision } from '../server/expedition-rules.js';

const fresh = { step: 0, phase: 'question', route: 'start', reward: 1, trail: [] };
assert.deepEqual(expeditionLevelOrder(0, 'start')[0], 'A1');
assert.deepEqual(expeditionLevelOrder(5, 'easy')[0], 'A2');
assert.deepEqual(expeditionLevelOrder(5, 'hard')[0], 'B2');
assert.equal(expeditionChoice(fresh, 'hard', 2, 3), null);
assert.equal(expeditionChoice({ ...fresh, phase: 'fork' }, 'invalid', 2, 3), null);
const fork = { ...fresh, step: 1, phase: 'fork' };
const hard = expeditionChoice(fork, 'hard', 2, 3);
assert.equal(hard.reward, 3);
assert.equal(hard.livesLeft, 2);
assert.equal(hard.wager, false);
assert.equal(expeditionAnswer(hard, true, 'A2', 2).points, 3);
const camp = expeditionChoice(fork, 'camp', 2, 3);
assert.equal(camp.livesLeft, 3);
assert.equal(camp.reward, 1);
assert.equal(expeditionChoice(fork, 'camp', 3, 3).livesLeft, 3);
const miss = expeditionAnswer(hard, false, 'B1', 1);
assert.equal(miss.livesLeft, 0);
assert.equal(miss.done, 'lives');
assert.equal(miss.points, 0);
assert.equal(miss.livesLost, 1);
const summit = expeditionAnswer({ ...hard, step: EXPEDITION_LENGTH - 1 }, true, 'C2', 3);
assert.equal(summit.done, 'summit');
assert.equal(summit.state.step, EXPEDITION_LENGTH);

// Wager: double-or-nothing on the hard road only.
assert.equal(expeditionChoice(fork, 'easy', 2, 3, true), null);
assert.equal(expeditionChoice(fork, 'camp', 2, 3, true), null);
const wagered = expeditionChoice(fork, 'hard', 3, 3, true);
assert.equal(wagered.reward, 6);
assert.equal(wagered.wager, true);
const wagerMiss = expeditionAnswer(wagered, false, 'B1', 3);
assert.equal(wagerMiss.livesLeft, 1);
assert.equal(wagerMiss.livesLost, 2);
assert.equal(wagerMiss.done, null);
const wagerDeath = expeditionAnswer(wagered, false, 'B1', 1);
assert.equal(wagerDeath.livesLeft, 0);
assert.equal(wagerDeath.done, 'lives');
assert.equal(expeditionAnswer(wagered, true, 'B1', 3).state.wager, false);

// Combos: x2 at three in a row, x3 at five.
assert.equal(comboMultiplier(0), 1);
assert.equal(comboMultiplier(2), 1);
assert.equal(comboMultiplier(3), 2);
assert.equal(comboMultiplier(4), 2);
assert.equal(comboMultiplier(5), 3);
let comboState = { ...freshExpeditionState(), reward: 1 };
let first = expeditionAnswer(comboState, true, 'A1', 3);
assert.equal(first.points, 1);
assert.equal(first.state.combo, 1);
let third = expeditionAnswer({ ...first.state, reward: 1 }, true, 'A1', 3);
third = expeditionAnswer({ ...third.state, reward: 1 }, true, 'A1', 3);
assert.equal(third.state.combo, 3);
assert.equal(third.points, 2);
const broken = expeditionAnswer(third.state, false, 'A1', 3);
assert.equal(broken.state.combo, 0);
assert.equal(broken.points, 0);
// Question bonuses (bounty/boss) stack on top of the multiplied reward.
const bonus = expeditionAnswer({ ...third.state, reward: 1, questionBonus: 2 }, true, 'A1', 3);
assert.equal(bonus.state.combo, 4);
assert.equal(bonus.points, 1 * 2 + 2);

// Provisions.
const stocked = freshExpeditionState();
assert.deepEqual(stocked.provisions, { loupe: 1, second_chance: 1, dictionary: 1 });
const louped = useProvision(stocked, 'loupe');
assert.equal(louped.provisions.loupe, 0);
assert.equal(louped.provisions.dictionary, 1);
assert.equal(useProvision(louped, 'loupe'), null);
assert.equal(useProvision({ ...stocked, phase: 'fork' }, 'loupe'), null);
assert.equal(useProvision(stocked, 'unknown'), null);

// Boss encounters.
assert.deepEqual(BOSS_ENCOUNTERS, [5, 10]);
assert.equal(isBossEncounter(5), true);
assert.equal(isBossEncounter(10), true);
assert.equal(isBossEncounter(4), false);
assert.equal(isBossEncounter(1), false);

// Loupe trimming.
const choices = [{ id: 'a', text: 'Bonjour' }, { id: 'b', text: 'Bonsoir' }, { id: 'c', text: 'Bonne nuit' }, { id: 'd', text: 'Au revoir' }];
const removed = loupeRemovals(choices, 'a');
assert.equal(removed.length, 2);
assert.ok(!removed.includes('a'));
assert.ok(removed.every((id) => ['b', 'c', 'd'].includes(id)));
assert.equal(loupeRemovals([{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }], 'a'), null);
assert.equal(loupeRemovals([{ id: 'a', text: 'x' }], 'a'), null);
console.log('Expedition rules passed');
