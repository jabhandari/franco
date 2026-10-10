// Unit checks for the levels presenter: shared CEFR level list.
import { CEFR_LEVELS } from './levels.presenter.js';
import { readFileSync } from 'node:fs';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

assert(
  Array.isArray(CEFR_LEVELS) && CEFR_LEVELS.join(',') === 'A1,A2,B1,B2,C1,C2',
  'CEFR_LEVELS: A1..C2 in order'
);
{
  const conceptsSrc = readFileSync(new URL('../components/concepts.jsx', import.meta.url), 'utf8');
  assert(
    /from '\.\.\/presenters\/levels\.presenter\.js'/.test(conceptsSrc) && /export const LEVELS = CEFR_LEVELS;/.test(conceptsSrc),
    'concepts LEVELS export still aliases CEFR_LEVELS'
  );
}

console.log('levels.presenter checks passed');
