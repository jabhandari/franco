// Unit checks for the words presenter: vocabulary helpers moved verbatim
// from the concepts view.
import { POS_LABELS, describeWord } from './words.presenter.ts';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

assert(
  describeWord('{"lemma":"accord","pos":"NOM","gender":"m","freq_rank":145}') === 'noun · masculine · common (#145)',
  'describeWord: full Lexique row -> readable description'
);
assert(
  describeWord('{"lemma":"aller","pos":"VER","gender":"f","number":"s","freq_rank":45}') === 'verb · feminine · singular · very common (#45)',
  'describeWord: feminine singular very-common verb'
);
assert(
  describeWord('{"lemma":"xyz","pos":"NOM","freq_rank":5000}') === 'noun · less common (#5000)',
  'describeWord: less-common bucket without gender'
);
assert(
  describeWord('{"lemma":"xyz","pos":"NOM:sub"}') === 'noun',
  'describeWord: pos subtype split on colon'
);
assert(
  describeWord('{"lemma":"xyz","pos":"XYZ"}') === 'xyz',
  'describeWord: unknown pos code lowercased'
);
assert(
  describeWord('le / la / l’ / les') === 'le / la / l’ / les',
  'describeWord: plain-text topic unchanged'
);
assert(
  describeWord('not json') === 'not json',
  'describeWord: invalid JSON unchanged'
);
assert(
  describeWord('["a","b"]') === '["a","b"]',
  'describeWord: JSON array (no pos) unchanged'
);
assert(
  describeWord('{"lemma":"x"}') === '{"lemma":"x"}',
  'describeWord: JSON object without pos unchanged'
);
assert(describeWord(42) === '42', 'describeWord: non-string -> safeText');
assert(describeWord(null) === '', 'describeWord: null -> ""');
assert(
  describeWord('{"lemma":"xyz","pos":"NOM","freq_rank":0}') === 'noun',
  'describeWord: zero rank omitted'
);
assert(
  describeWord('{"lemma":"xyz","pos":"NOM","number":"p"}') === 'noun · plural',
  'describeWord: plural marker'
);

assert(POS_LABELS.NOM === 'noun', 'POS_LABELS: NOM -> noun');
assert(POS_LABELS.VER === 'verb', 'POS_LABELS: VER -> verb');
assert(POS_LABELS.AUX === 'auxiliary verb', 'POS_LABELS: AUX -> auxiliary verb');
assert(Object.keys(POS_LABELS).length === 13, 'POS_LABELS: all 13 codes moved');

console.log('words.presenter checks passed');
