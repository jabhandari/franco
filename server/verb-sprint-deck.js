import { createHmac } from 'node:crypto';

// Reviewed, game-specific present-tense forms. They are not published content
// items; future authored conjugation items can replace this small starter deck.
const SUBJECTS = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
const VERBS = [
  { infinitive: 'être', level: 'A1', forms: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'] },
  { infinitive: 'avoir', level: 'A1', forms: ['ai', 'as', 'a', 'avons', 'avez', 'ont'] },
  { infinitive: 'aller', level: 'A1', forms: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'] },
  { infinitive: 'parler', level: 'A1', forms: ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'] },
  { infinitive: 'faire', level: 'A2', forms: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'] },
  { infinitive: 'finir', level: 'A2', forms: ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent'] },
  { infinitive: 'prendre', level: 'A2', forms: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'] },
  { infinitive: 'pouvoir', level: 'B1', forms: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'] },
  { infinitive: 'vouloir', level: 'B1', forms: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'] },
];

export const VERB_CARDS = VERBS.flatMap((verb) => SUBJECTS.map((subject, index) => ({
  id: `${verb.infinitive}:${index}`, infinitive: verb.infinitive, subject,
  level: verb.level, answer: verb.forms[index], forms: [...new Set(verb.forms)],
})));

const BY_ID = new Map(VERB_CARDS.map((card) => [card.id, card]));
const LEVELS = ['A1', 'A2', 'B1'];

function choiceToken(secret, id, text) {
  return createHmac('sha256', secret).update(`verb:${id}:${text}`).digest('hex').slice(0, 24);
}

export function chooseVerbCard(score, seen, random = Math.random) {
  const target = Math.min(LEVELS.length - 1, Math.floor(score / 6));
  for (const level of LEVELS.slice(target).concat(LEVELS.slice(0, target).reverse())) {
    const available = VERB_CARDS.filter((card) => card.level === level && !seen.includes(card.id));
    if (available.length) return available[Math.floor(random() * available.length)];
  }
  return null;
}

export function verbCard(id) { return BY_ID.get(id) || null; }

export function publicVerbQuestion(card, secret) {
  if (!card) return null;
  const choices = card.forms.map((text) => ({ id: choiceToken(secret, card.id, text), text }))
    .sort((a, b) => a.id.localeCompare(b.id)).slice(0, 4);
  if (!choices.some((choice) => choice.text === card.answer)) {
    choices[choices.length - 1] = { id: choiceToken(secret, card.id, card.answer), text: card.answer };
  }
  return { id: card.id, level: card.level, kind: 'choice', type: 'verb_sprint',
    prompt: `${card.subject} · ${card.infinitive}`, context: 'Présent · choose the correct verb form',
    instructions: null, audio_url: null, choices };
}

export function gradeVerbChoice(card, submittedToken, secret) {
  if (!card || typeof submittedToken !== 'string') return null;
  const shown = publicVerbQuestion(card, secret).choices;
  const choice = shown.find((option) => option.id === submittedToken);
  return choice ? choice.text === card.answer : null;
}
