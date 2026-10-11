// Unit checks for the levels presenter: shared CEFR level list.
import { CEFR_LEVELS, CLB_BY_CEFR, clbForCefr, formatLevelWithClb } from './levels.presenter.js';
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

// FRA-50: CEFR -> CLB static mapping used by level cards and exam views.
assert(
  CEFR_LEVELS.every((level) => typeof CLB_BY_CEFR[level] === 'string' && CLB_BY_CEFR[level].length > 0),
  'CLB_BY_CEFR: every CEFR level has a CLB entry'
);
assert(clbForCefr('B2') === '7', "clbForCefr('B2') is '7'");
assert(clbForCefr('A1') === '1–2', "clbForCefr('A1') is '1–2'");
assert(clbForCefr('C2') === '10–12', "clbForCefr('C2') is '10–12'");
assert(clbForCefr('Z9') === null, "clbForCefr('Z9') falls back to null");
assert(formatLevelWithClb('B2') === 'B2 (CLB 7)', "formatLevelWithClb('B2') is 'B2 (CLB 7)'");
assert(formatLevelWithClb('Z9') === 'Z9', "formatLevelWithClb('Z9') falls back to bare level");
{
  const conceptsSrc = readFileSync(new URL('../components/concepts.jsx', import.meta.url), 'utf8');
  assert(
    /formatLevelWithClb\(section\)/.test(conceptsSrc),
    'LevelGuide eyebrow renders the CEFR · CLB label'
  );
  const pastSrc = readFileSync(new URL('../views/PastQuestions.jsx', import.meta.url), 'utf8');
  assert(
    /formatLevelWithClb\(section\)/.test(pastSrc) && /Canadian Language Benchmark/.test(pastSrc),
    'PastQuestions references the CLB mapping in section meta and lede'
  );
  const placementSrc = readFileSync(new URL('../views/Placement.tsx', import.meta.url), 'utf8');
  assert(
    /formatLevelWithClb\(result\.level\)/.test(placementSrc),
    'Placement result shows the CEFR · CLB label'
  );
}

console.log('fra-50 CLB mapping checks passed');
