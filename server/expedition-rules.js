export const EXPEDITION_LENGTH = 10;
export const EXPEDITION_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
// 1-indexed encounter numbers guarded by a "Gardien" boss encounter.
export const BOSS_ENCOUNTERS = [5, 10];
export const PROVISION_KINDS = ['loupe', 'second_chance', 'dictionary'];
export const MAX_BOUNTIES = 5;

export function freshExpeditionState() {
  return {
    step: 0, phase: 'question', route: 'start', reward: 1, trail: [],
    combo: 0, wager: false, questionBonus: 0,
    provisions: { loupe: 1, second_chance: 1, dictionary: 1 },
    removedChoices: [], bounties: [], misses: [],
    activeBounty: null, bossEncounter: false,
    bountiesCleared: 0, bossesBeaten: 0,
  };
}

export function comboMultiplier(combo) {
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function isBossEncounter(encounterNumber) {
  return BOSS_ENCOUNTERS.includes(encounterNumber);
}

export function expeditionTarget(step, route) {
  const base = Math.min(5, Math.floor(step / 2));
  return Math.max(0, Math.min(5, base + (route === 'hard' ? 1 : route === 'easy' ? -1 : 0)));
}

export function expeditionLevelOrder(step, route) {
  const target = expeditionTarget(step, route);
  return EXPEDITION_LEVELS.map((level, index) => ({ level, index }))
    .sort((a, b) => Math.abs(a.index - target) - Math.abs(b.index - target) || a.index - b.index)
    .map(({ level }) => level);
}

export function expeditionChoice(state, route, livesLeft, livesTotal, wager = false) {
  if (state.phase !== 'fork' || !['easy', 'hard', 'camp'].includes(route)) return null;
  if (wager && route !== 'hard') return null;
  const healed = route === 'camp' ? Math.min(livesTotal, livesLeft + 1) : livesLeft;
  const isWager = route === 'hard' && wager === true;
  return { ...state, phase: 'question', route, reward: route === 'hard' ? (isWager ? 6 : 3) : 1,
    wager: isWager, trail: [...state.trail, { kind: route, step: state.step + 1 }], livesLeft: healed };
}

export function expeditionAnswer(state, correct, level, livesLeft) {
  const step = state.step + 1;
  const combo = correct ? (state.combo ?? 0) + 1 : 0;
  const points = correct ? state.reward * comboMultiplier(combo) + (state.questionBonus ?? 0) : 0;
  const livesLost = correct ? 0 : state.wager ? 2 : 1;
  const trail = [...state.trail, { kind: correct ? 'success' : 'miss', step, level, points, combo }];
  const nextLives = Math.max(0, livesLeft - livesLost);
  const done = nextLives === 0 ? 'lives' : step >= EXPEDITION_LENGTH ? 'summit' : null;
  return { state: { ...state, step, combo, questionBonus: 0, wager: false,
      phase: correct && !done ? 'fork' : 'question',
      route: correct ? state.route : 'easy', reward: correct ? state.reward : 1,
      trail },
    livesLeft: nextLives, points, done, livesLost };
}

export function useProvision(state, kind) {
  if (!PROVISION_KINDS.includes(kind) || state.phase !== 'question') return null;
  const remaining = state.provisions?.[kind] ?? 0;
  if (remaining <= 0) return null;
  return { ...state, provisions: { ...state.provisions, [kind]: remaining - 1 } };
}

// Pick up to two wrong original choice ids for the loupe (50/50). Returns
// null when the question cannot be trimmed. Always leaves at least two
// choices standing so the loupe never hands over the answer outright.
export function loupeRemovals(choices, answerId) {
  const wrong = choices.filter((choice) => String(choice.id ?? choice.key) !== String(answerId));
  const removable = Math.min(2, wrong.length, choices.length - 2);
  if (removable <= 0) return null;
  const shuffled = [...wrong].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, removable).map((choice) => String(choice.id ?? choice.key));
}
