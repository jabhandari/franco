// Unit checks for the FRA-155 daily-words presenter.
import { dailyWordsPath, wordMeta, questionHeading, practiceProgress, nextQuestion } from './daily-words.presenter.ts';
import type { DailyWord, WordQuestion } from '../api/client.ts';

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

const word: DailyWord = { id: 'w-a1-001', word: 'maison', level: 'A1', gloss: 'house', part_of_speech: 'noun', example_fr: 'Ma maison est petite.', example_en: 'My house is small.', is_recycled: false };
const recycled: DailyWord = { ...word, id: 'w-a1-002', is_recycled: true };
const q = (id: string, type: WordQuestion['type']): WordQuestion => ({ id, word_id: word.id, type, prompt: 'p', choices: [] });

assert(dailyWordsPath('America/Toronto') === '/api/me/words/today?tz=America%2FToronto', 'dailyWordsPath: tz is encoded');
assert(wordMeta(word) === 'noun', 'wordMeta: plain part of speech');
assert(wordMeta(recycled) === 'noun · Review', 'wordMeta: recycled words are labelled Review');
assert(questionHeading(q('a', 'meaning')) === 'What does it mean?', 'questionHeading: meaning');
assert(questionHeading(q('a', 'word')) === 'Find the French word', 'questionHeading: word');
assert(questionHeading(q('a', 'blank')) === 'Complete the sentence', 'questionHeading: blank');
assert(practiceProgress(3, 10) === '3 of 10 answered', 'practiceProgress: in progress');
assert(practiceProgress(10, 10) === 'Done for today — come back tomorrow', 'practiceProgress: completed');
assert(practiceProgress(0, 0) === '0 of 0 answered', 'practiceProgress: empty day does not claim completion');
const questions = [q('q1', 'meaning'), q('q2', 'word')];
assert(nextQuestion(questions, {})?.id === 'q1', 'nextQuestion: first unanswered');
assert(nextQuestion(questions, { q1: { correct: true } })?.id === 'q2', 'nextQuestion: skips answered');
assert(nextQuestion(questions, { q1: { correct: true }, q2: { correct: false } }) === null, 'nextQuestion: null when all answered (wrong answers still count as answered)');

console.log('daily-words.presenter checks passed');
