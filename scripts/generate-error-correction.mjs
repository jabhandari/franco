// FRA-7: generate "find the mistake" error-correction items (v1: multiple_choice).
//
// Reads UD French GSD CoNLL-U, injects exactly one controlled error per
// distractor (agreement / tense / preposition), and emits a content.v1 batch
// plus an audit manifest. All items are multiple_choice with
// evaluation.mode='choice' so they render in the existing MultipleChoice
// component — no renderer or contract change.
//
// Usage:
//   node scripts/generate-error-correction.mjs --input /path/to/fr_gsd-ud-train.conllu [--limit 250]
//   node scripts/generate-error-correction.mjs --url <conllu-url> [--limit 250]
//
// Output:
//   content/batches/fra7-error-correction.v1.json
//   content/batches/fra7-error-correction.v1.manifest.json
//
// Sentence material: UD French GSD (CC BY-SA 4.0, Universal Dependencies).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBatch } from '../server/content-contract.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_URL = 'https://raw.githubusercontent.com/UniversalDependencies/UD_French-GSD/master/fr_gsd-ud-train.conllu';
const BATCH_ID = 'fra7-error-correction-v1';
const WORD_RE = /^[\p{L}'’-]+$/u;

// ---------------------------------------------------------------- parsing

function parseConllu(text) {
  return text.split(/\n\s*\n/g).map(parseBlock).filter(Boolean);
}

function parseBlock(block) {
  const metadata = {};
  const tokens = [];
  for (const line of block.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const m = line.match(/^#\s*([^=]+?)\s*=\s*(.*)$/);
      if (m) metadata[m[1].trim()] = m[2].trim();
      continue;
    }
    const cols = line.split('\t');
    if (cols.length < 8 || cols[0].includes('-') || cols[0].includes('.')) continue;
    tokens.push({ id: cols[0], form: cols[1], lemma: cols[2], upos: cols[3], feats: cols[5], head: cols[6], deprel: cols[7] });
  }
  const t = metadata.text;
  if (!t || !tokens.length) return null;
  return { sentId: metadata.sent_id || createHash('sha1').update(t).digest('hex'), text: t, tokens };
}

// French detokenization. Sentences are only kept when this reproduces the
// source text EXACTLY, so distractors differ from the original by exactly
// the corrupted token (no spacing tells).
function detokenize(tokens) {
  let s = tokens.map((t) => t.form).join(' ');
  s = s.replace(/ ([,.;:!?…»)\]}])/g, '$1');
  s = s.replace(/([«(\[{]) /g, '$1');
  s = s.replace(/(\S['’]) /g, '$1');
  return s;
}

function analyze(tokens) {
  const words = tokens.filter((t) => WORD_RE.test(t.form));
  const uposCounts = {};
  for (const t of words) uposCounts[t.upos] = (uposCounts[t.upos] || 0) + 1;
  const finiteVerbCount = words.filter((t) => t.upos === 'VERB' || t.upos === 'AUX').length;
  const hasSubordination = words.some((t) => ['SCONJ', 'PRON'].includes(t.upos) && ['que', 'qui', 'dont', 'lorsque'].includes(t.lemma.toLowerCase()));
  const rareMorphology = words.filter((t) => /Mood=Sub|Tense=Past|VerbForm=Part/.test(t.feats)).length;
  const score = words.length + finiteVerbCount * 2 + (uposCounts.ADP || 0) + (hasSubordination ? 8 : 0) + rareMorphology * 3;
  return { tokenCount: words.length, score, adjectiveCount: uposCounts.ADJ || 0 };
}

function assignSection(analysis) {
  if (analysis.score <= 9) return 'A1';
  if (analysis.score <= 15) return 'A2';
  if (analysis.score <= 23) return 'B1';
  return 'B2';
}

// ------------------------------------------------------- error injection

const hasFeat = (tok, feat) => (tok.feats || '').includes(feat);

function agreementInjections(tokens) {
  const out = [];
  tokens.forEach((tok, i) => {
    if (tok.upos !== 'ADJ') return;
    const f = tok.form;
    const fem = hasFeat(tok, 'Gender=Fem');
    const masc = hasFeat(tok, 'Gender=Masc');
    const plur = hasFeat(tok, 'Number=Plur');
    const sing = hasFeat(tok, 'Number=Sing');
    let corrupted = null;
    let kind = '';
    if (fem && f.endsWith('euse')) { corrupted = f.slice(0, -4) + 'eux'; kind = 'fem->masc (-euse→-eux)'; }
    else if (masc && f.endsWith('eux')) { corrupted = f.slice(0, -3) + 'euse'; kind = 'masc->fem (-eux→-euse)'; }
    else if (plur && f.endsWith('aux') && tok.lemma.endsWith('al')) { corrupted = f.slice(0, -3) + 'al'; kind = 'plur->sing (-aux→-al)'; }
    else if (plur && f.endsWith('s') && !f.endsWith('aux')) { corrupted = f.slice(0, -1); kind = 'plur->sing (drop -s)'; }
    else if (fem && sing && f.endsWith('e') && !f.endsWith('ee')) { corrupted = f.slice(0, -1); kind = 'fem->masc (drop -e)'; }
    else if (masc && sing && tok.lemma.endsWith('e') && !f.endsWith('e')) { corrupted = f + 'e'; kind = 'masc->fem (add -e)'; }
    if (corrupted && corrupted !== f) {
      out.push({ type: 'agreement', index: i, original: f, corrupted, note: `${tok.lemma} [${tok.feats}] ${kind}` });
    }
  });
  return out;
}

const AUX_SWAP = {
  'ai|1|Sing': 'suis', 'suis|1|Sing': 'ai',
  'as|2|Sing': 'es', 'es|2|Sing': 'as',
  'a|3|Sing': 'est', 'est|3|Sing': 'a',
  'avons|1|Plur': 'sommes', 'sommes|1|Plur': 'avons',
  'avez|2|Plur': 'êtes', 'êtes|2|Plur': 'avez',
  'ont|3|Plur': 'sont', 'sont|3|Plur': 'ont',
};

function tenseInjections(tokens) {
  const out = [];
  const byId = new Map(tokens.map((t) => [t.id, t]));
  tokens.forEach((tok, i) => {
    if (tok.upos === 'AUX' && ['être', 'avoir'].includes(tok.lemma)) {
      const head = byId.get(tok.head);
      if (!head || !/VerbForm=Part/.test(head.feats || '')) return;
      if (i > 0 && /['’]$/.test(tokens[i - 1].form)) return; // skip l'a → l'est (ambiguous)
      const person = (tok.feats.match(/Person=(\d)/) || [])[1];
      const number = (tok.feats.match(/Number=(\w+)/) || [])[1];
      if (!person || !number) return;
      const swap = AUX_SWAP[`${tok.form.toLowerCase()}|${person}|${number}`];
      if (!swap) return;
      const corrupted = /^[A-ZÀÂÄÉÈÊË]/.test(tok.form) ? swap[0].toUpperCase() + swap.slice(1) : swap;
      out.push({ type: 'tense', index: i, original: tok.form, corrupted, note: `passé-composé aux ${tok.lemma} ${tok.form}→${swap}` });
    }
    if (tok.upos === 'VERB' && /VerbForm=Part/.test(tok.feats || '') && tok.lemma.endsWith('er')) {
      if (tok.form.endsWith('é') && !/ée?s?$/.test(tok.form)) {
        out.push({ type: 'tense', index: i, original: tok.form, corrupted: tok.lemma, note: 'past participle → infinitive' });
      }
    }
  });
  return out;
}

// Conservative, high-confidence preposition swaps. Each rule targets a frame
// where the replacement is unambiguously ungrammatical.
const COLLOC = {
  penser: ['à', 'de'], besoin: ['de', 'à'], envie: ['de', 'à'],
  commencer: ['à', 'de'], essayer: ['de', 'à'], décider: ['de', 'à'],
  oublier: ['de', 'à'], arrêter: ['de', 'à'], réussir: ['à', 'de'],
  aider: ['à', 'de'], aller: ['à', 'de'],
};

function prepositionInjections(tokens) {
  const out = [];
  const wordIdx = tokens.map((t, i) => ({ t, i })).filter(({ t }) => WORD_RE.test(t.form));
  const isContracted = (f) => /^(au|aux|du|des)$/i.test(f);
  wordIdx.forEach(({ t, i }, wi) => {
    if (t.upos !== 'ADP') return;
    const low = t.form.toLowerCase();
    if (!['à', 'de', 'en', 'par', 'pour'].includes(low) || isContracted(t.form)) return;
    const prev = wi > 0 ? wordIdx[wi - 1].t : null;
    const next = wi + 1 < wordIdx.length ? wordIdx[wi + 1].t : null;
    const push = (corrupted, note) => out.push({ type: 'preposition', index: i, original: t.form, corrupted, note });
    // pour + infinitive → par ("pour manger" → "par manger")
    if (low === 'pour' && next && next.upos === 'VERB' && /VerbForm=Inf/.test(next.feats || '')) {
      push('par', 'pour + infinitive → par'); return;
    }
    // en + year/proper noun → à ("en 2020", "en France")
    if (low === 'en' && next && (next.upos === 'PROPN' || (next.upos === 'NUM' && /^\d+$/.test(next.form)))) {
      push('à', 'en + year/proper noun → à'); return;
    }
    // à + number → en ("à 8 heures")
    if (low === 'à' && next && next.upos === 'NUM') {
      push('en', 'à + number → en'); return;
    }
    // de after noun + before proper noun → à ("le livre de Marie")
    if (low === 'de' && prev && prev.upos === 'NOUN' && next && next.upos === 'PROPN') {
      push('à', 'de + proper noun → à'); return;
    }
    // verb-governed collocations ("penser à" → "penser de")
    for (let b = Math.max(0, wi - 3); b < wi; b++) {
      const gov = wordIdx[b].t;
      const entry = COLLOC[gov.lemma.toLowerCase()];
      if (entry && entry[0] === low) { push(entry[1], `${gov.lemma} + ${entry[0]} → ${entry[1]}`); break; }
    }
  });
  return out;
}

function applyInjection(tokens, inj) {
  const forms = tokens.map((t, i) => (i === inj.index ? inj.corrupted : t.form));
  let s = forms.join(' ');
  s = s.replace(/ ([,.;:!?…»)\]}])/g, '$1');
  s = s.replace(/([«(\[{]) /g, '$1');
  s = s.replace(/(\S['’]) /g, '$1');
  return s;
}

// Deterministic shuffle (mulberry32 seeded from string hash).
function seededShuffle(arr, seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function tokenDiffCount(a, b) {
  const ta = a.split(' ');
  const tb = b.split(' ');
  if (ta.length !== tb.length) return -1;
  return ta.filter((tok, i) => tok !== tb[i]).length;
}

// ---------------------------------------------------------------- main

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const LIMIT = parseInt(argVal('--limit', '250'), 10);

async function loadConllu() {
  const input = argVal('--input', null);
  const inputs = input ? input.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (inputs.length) {
    let combined = '';
    for (const p of inputs) combined += readFileSync(p, 'utf8') + '\n';
    return combined;
  }
  const url = argVal('--url', DEFAULT_URL);
  console.log(`Downloading ${url} ...`);
  const res = await fetch(url, { headers: { 'user-agent': 'franco-learning-importer' } });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return res.text();
}

const raw = await loadConllu();
const sentences = parseConllu(raw);
console.log(`parsed ${sentences.length} sentences`);

const seen = new Set();
const candidates = [];
for (const s of sentences) {
  const analysis = analyze(s.tokens);
  if (analysis.tokenCount < 4 || analysis.tokenCount > 28) continue;
  if (/[{}[\]|<>]/.test(s.text)) continue;
  if (detokenize(s.tokens) !== s.text) continue; // exact-reconstruction invariant
  const norm = s.text.toLowerCase();
  if (seen.has(norm)) continue;
  seen.add(norm);
  const injections = [...agreementInjections(s.tokens), ...tenseInjections(s.tokens), ...prepositionInjections(s.tokens)];
  const uniq = [];
  const seenText = new Set([s.text]);
  for (const inj of injections) {
    const corruptedText = applyInjection(s.tokens, inj);
    if (seenText.has(corruptedText)) continue;
    const diff = tokenDiffCount(s.text, corruptedText);
    if (diff !== 1) continue; // exactly one token must differ
    seenText.add(corruptedText);
    uniq.push({ ...inj, text: corruptedText });
  }
  if (uniq.length < 3) continue;
  candidates.push({ s, analysis, section: assignSection(analysis), injections: uniq });
}
console.log(`candidates with >=3 single-error distractors: ${candidates.length}`);

// Round-robin across CEFR sections for balanced coverage.
const bySection = { A1: [], A2: [], B1: [], B2: [] };
for (const c of candidates) bySection[c.section].push(c);
// Deterministic order within sections.
for (const sec of Object.keys(bySection)) {
  bySection[sec] = seededShuffle(bySection[sec], `fra7-order-${sec}`);
}
const BAND = { A1: 'introductory', A2: 'basic', B1: 'intermediate', B2: 'advanced' };
const items = [];
const manifest = [];
const order = ['A1', 'A2', 'B1', 'B2'];
let si = 0;
while (items.length < LIMIT) {
  const sec = order[si % order.length]; si++;
  const c = bySection[sec].shift();
  if (!c) {
    if (Object.values(bySection).every((a) => a.length === 0)) break;
    continue;
  }
  // Prefer type diversity: one of each type first, then fill.
  const picked = [];
  for (const t of ['agreement', 'tense', 'preposition']) {
    const inj = c.injections.find((u) => u.type === t && !picked.includes(u));
    if (inj) picked.push(inj);
    if (picked.length === 3) break;
  }
  for (const u of c.injections) {
    if (picked.length === 3) break;
    if (!picked.includes(u)) picked.push(u);
  }
  const externalId = `fra7-ec-${createHash('sha1').update(`${c.s.sentId}|${BATCH_ID}`).digest('hex').slice(0, 12)}`;
  const correctId = 'a';
  const distractors = picked.map((p, k) => ({ id: ['b', 'c', 'd'][k], text: p.text, inj: p }));
  const shuffled = seededShuffle([{ id: correctId, text: c.s.text }, ...distractors], externalId);
  const answer = shuffled.find((ch) => ch.id === correctId);
  // Re-letter choices a..d in display order; answer = the correct one's new id.
  const letters = ['a', 'b', 'c', 'd'];
  const choices = shuffled.map((ch, k) => ({ id: letters[k], text: ch.text }));
  const answerId = letters[shuffled.indexOf(answer)];
  const errorTypes = [...new Set(picked.map((p) => p.type))];

  items.push({
    external_id: externalId,
    type: 'multiple_choice',
    title: 'Trouvez la phrase correcte',
    prompt: 'Choisissez la phrase correcte.',
    instructions: 'Une seule de ces quatre phrases est correcte : les trois autres contiennent chacune exactement une erreur.',
    cefr: { level: c.section, method: 'heuristic', confidence: 0.6, evidence: 'UD GSD difficulty heuristic; single error injected by script' },
    difficulty: { band: BAND[c.section], score: Math.round(c.analysis.score), method: 'ud-gsd-heuristic' },
    response: { choices, answer: answerId },
    evaluation: { mode: 'choice' },
    tags: ['error-correction', 'find-the-mistake', 'ud-french-gsd', ...errorTypes],
  });
  manifest.push({
    external_id: externalId,
    sentence_id: c.s.sentId,
    sentence_text: c.s.text,
    cefr_section: c.section,
    answer_choice_id: answerId,
    choices: choices.map((ch) => ({ id: ch.id, text: ch.text, is_correct: ch.id === answerId })),
    injections: picked.map((p) => ({
      error_type: p.type,
      token_index: p.index,
      original_token: p.original,
      corrupted_token: p.corrupted,
      corrupted_text: p.text,
      note: p.note,
    })),
  });
}

console.log(`generated ${items.length} items`);

const batch = {
  schema_version: 'content.v1',
  batch_id: BATCH_ID,
  idempotency_key: BATCH_ID,
  source: {
    id: 'fra7-error-correction',
    name: 'FRA-7 error-correction generator',
    url: 'https://github.com/SnJTwoTales/franco/blob/main/scripts/generate-error-correction.mjs',
    license: 'CC BY-SA 4.0',
    attribution: 'Sentence material: UD French GSD (CC BY-SA 4.0, Universal Dependencies). One controlled error injected per distractor by script.',
  },
  items,
};

const checked = validateBatch(batch);
if (!checked.valid) {
  console.error('CONTRACT INVALID:', JSON.stringify(checked.errors, null, 2).slice(0, 4000));
  process.exit(1);
}

const outDir = join(ROOT, 'content', 'batches');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'fra7-error-correction.v1.json'), `${JSON.stringify(batch, null, 1)}\n`);
writeFileSync(join(outDir, 'fra7-error-correction.v1.manifest.json'), `${JSON.stringify({ batch_id: BATCH_ID, generated_utc: new Date().toISOString(), item_count: manifest.length, items: manifest }, null, 1)}\n`);

const typeCounts = {};
for (const m of manifest) for (const inj of m.injections) typeCounts[inj.error_type] = (typeCounts[inj.error_type] || 0) + 1;
const sectionCounts = {};
for (const m of manifest) sectionCounts[m.cefr_section] = (sectionCounts[m.cefr_section] || 0) + 1;
console.log('contract: VALID');
console.log('sections:', JSON.stringify(sectionCounts));
console.log('distractor error types:', JSON.stringify(typeCounts));
console.log(`wrote ${outDir}/fra7-error-correction.v1.json + .manifest.json`);
