// Unit checks for the concept-status presenter (FRA-48): mastered / learning /
// locked derivation from learner mastery plus the prerequisite DAG.
import {
  MASTERED_THRESHOLD,
  WEAK_THRESHOLD,
  deriveStatus,
  buildConceptRows,
  summarizeStatuses,
  filterWeakSpots,
} from './concept-status.presenter.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- deriveStatus ---
assert(deriveStatus(0.9, []) === 'mastered', 'mastered: high mastery, no prereqs');
assert(deriveStatus(0.9, [0.85, 1]) === 'mastered', 'mastered: prereqs also mastered');
assert(deriveStatus(MASTERED_THRESHOLD, []) === 'mastered', 'mastered: exactly at threshold');
assert(deriveStatus(0.5, []) === 'learning', 'learning: mid mastery, no prereqs');
assert(deriveStatus(0, []) === 'learning', 'learning: zero mastery but unlocked');
assert(deriveStatus(null, []) === 'learning', 'learning: missing mastery treated as 0, unlocked');
assert(deriveStatus(0.95, [0.2]) === 'locked', 'locked: one prereq below threshold');
assert(deriveStatus(0.95, []) === 'mastered', 'not locked: no prereqs even with high mastery');
assert(deriveStatus(0.1, [null]) === 'locked', 'locked: missing prereq mastery counts as 0');
assert(deriveStatus(0.9, [0.8, 0.79]) === 'locked', 'locked: prereq just under threshold blocks');
assert(deriveStatus(0.9, null) === 'mastered', 'tolerates null prereq list');

// --- buildConceptRows: prerequisite slugs resolve through the concept list ---
const concepts = [
  { id: 'c1', slug: 'basic', title: 'Basic', concept_type: 'grammar', level_code: 'A1', prerequisites: [] },
  { id: 'c2', slug: 'advanced', title: 'Advanced', concept_type: 'grammar', level_code: 'A1', prerequisites: ['basic'] },
  { id: 'c3', slug: 'orphan-prereq', title: 'Orphan', concept_type: 'vocab', level_code: 'A1', prerequisites: ['nope'] },
];
const rows = buildConceptRows(concepts, new Map([['c1', 0.9], ['c2', 0.9]]));
assert(rows[0].status === 'mastered', 'row: prereq-free concept mastered');
assert(rows[1].status === 'mastered', 'row: prereq mastered -> not locked');
assert(rows[2].status === 'locked', 'row: unknown prereq slug resolves to 0 -> locked');

const rows2 = buildConceptRows(concepts, new Map([['c1', 0.3]]));
assert(rows2[1].status === 'locked', 'row: unmastered prereq locks dependent');
assert(rows2[1].mastery === 0, 'row: missing mastery defaults to 0');

assert(buildConceptRows(null, new Map()).length === 0, 'tolerates null concept list');
assert(buildConceptRows(concepts, null)[0].status === 'learning', 'tolerates null mastery map');

// --- summarizeStatuses ---
const summary = summarizeStatuses(rows);
assert(summary.mastered === 2 && summary.locked === 1 && summary.learning === 0,
  'summarizeStatuses counts per status');
assert(summarizeStatuses([]).mastered === 0, 'summarizeStatuses handles empty');

// --- filterWeakSpots: learning rows + low mastery, never locked ---
const mixed = [
  { slug: 'a', mastery: 0.95, status: 'mastered' },
  { slug: 'b', mastery: 0.5, status: 'learning' },
  { slug: 'c', mastery: 0.1, status: 'learning' },
  { slug: 'd', mastery: 0.9, status: 'locked' },
  { slug: 'e', mastery: 0.2, status: 'locked' },
];
const weak = filterWeakSpots(mixed);
assert(weak.length === 2 && weak.every((r) => r.status === 'learning'),
  'filterWeakSpots keeps learning rows, excludes locked even with low mastery');
assert(filterWeakSpots([]).length === 0, 'filterWeakSpots handles empty');
assert(WEAK_THRESHOLD === 0.4, 'weak threshold matches the session weak-concept cutoff');

console.log('concept-status.presenter checks passed');
