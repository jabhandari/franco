import { createHash, randomUUID } from 'node:crypto';
import { db, migrate } from '../server/legacy-sqlite.js';

const SOURCE = {
  id: 'ud-fr-gsd',
  name: 'UD French GSD',
  url: 'https://github.com/UniversalDependencies/UD_French-GSD',
  rawUrl: 'https://raw.githubusercontent.com/UniversalDependencies/UD_French-GSD/master/fr_gsd-ud-dev.conllu',
  license: 'CC BY-SA 4.0',
  attribution: 'Universal Dependencies French GSD treebank'
};

const sections = ['A1', 'A2', 'B1', 'B2'];
const uposLabels = {
  VERB: 'verb',
  NOUN: 'noun',
  ADJ: 'adjective',
  ADV: 'adverb'
};

migrate();

const conllu = await downloadText(SOURCE.rawUrl);
const parsed = parseConllu(conllu)
  .map((sentence) => ({ ...sentence, analysis: analyze(sentence) }))
  .filter((sentence) => isUsable(sentence))
  .map((sentence) => ({ ...sentence, cefrSection: assignSection(sentence.analysis) }));

// Keep every usable sentence from the treebank. The source is already a finite
// development corpus; limiting it here made the practice pool unnecessarily small.
const selected = sections.flatMap((section) =>
  parsed.filter((sentence) => sentence.cefrSection === section)
    .sort((a, b) => a.analysis.score - b.analysis.score || a.text.length - b.text.length)
);

const insertSource = db.prepare(`
  INSERT INTO content_sources (id, name, url, license, attribution, imported_at)
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    url = excluded.url,
    license = excluded.license,
    attribution = excluded.attribution,
    imported_at = CURRENT_TIMESTAMP
`);

const insertExample = db.prepare(`
  INSERT INTO example_sentences (
    id, source_id, source_sentence_id, text, cefr_section, token_count, verb_count,
    noun_count, adjective_count, adposition_count, has_subordination, difficulty_score, metadata_json
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_id, source_sentence_id) DO UPDATE SET
    text = excluded.text,
    cefr_section = excluded.cefr_section,
    token_count = excluded.token_count,
    verb_count = excluded.verb_count,
    noun_count = excluded.noun_count,
    adjective_count = excluded.adjective_count,
    adposition_count = excluded.adposition_count,
    has_subordination = excluded.has_subordination,
    difficulty_score = excluded.difficulty_score,
    metadata_json = excluded.metadata_json
`);

const deleteExercisesForExample = db.prepare('DELETE FROM exercise_items WHERE example_id = ?');
const insertExercise = db.prepare(`
  INSERT INTO exercise_items (id, example_id, cefr_section, exercise_type, prompt, answer, choices_json, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

db.exec('BEGIN');
try {
  insertSource.run(SOURCE.id, SOURCE.name, SOURCE.url, SOURCE.license, SOURCE.attribution);

  for (const sentence of selected) {
    const id = stableId(sentence.sentId || sentence.text);
    const analysis = sentence.analysis;

    insertExample.run(
      id,
      SOURCE.id,
      sentence.sentId,
      sentence.text,
      sentence.cefrSection,
      analysis.tokenCount,
      analysis.verbCount,
      analysis.nounCount,
      analysis.adjectiveCount,
      analysis.adpositionCount,
      analysis.hasSubordination ? 1 : 0,
      analysis.score,
      JSON.stringify({
        lemmas: analysis.lemmas,
        uposCounts: analysis.uposCounts,
        note: 'CEFR section is a local heuristic, not an official UD annotation.'
      })
    );

    deleteExercisesForExample.run(id);
    for (const exercise of makeExercises(sentence, id)) {
      insertExercise.run(
        randomUUID(),
        id,
        sentence.cefrSection,
        exercise.type,
        exercise.prompt,
        exercise.answer,
        exercise.choices ? JSON.stringify(exercise.choices) : null,
        exercise.explanation
      );
    }
  }

  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const topicSource = SOURCE.id;
const topicRows = [
  ['Core verbs', 'être', 'être (suis, es, est, sommes, êtes, sont)'],
  ['Core verbs', 'avoir', 'avoir (ai, as, a, avons, avez, ont)'],
  ['Core verbs', 'aller', 'aller (vais, vas, va, allons, allez, vont)'],
  ['Core verbs', 'faire', 'faire, dire, prendre, aimer, travailler'],
  ['Present tense', '-er verbs', '-er verb conjugation'],
  ['Present tense', 'subject pronouns', 'je, tu, il/elle, nous, vous, ils/elles'],
  ['Negation', 'ne ... pas', 'ne + verb + pas'],
  ['Negation', "de/d'", "de/d' after negation"],
  ['Articles', 'definite', 'le / la / l’ / les'],
  ['Articles', 'indefinite', 'un / une / des'],
  ['Articles', 'contractions', 'au / à la / à l’'],
  ['Sentence structure', 'basic order', 'Subject + Verb + Object'],
  ['Questions', 'intonation', 'intonation questions'],
  ['Questions', 'est-ce que', 'est-ce que'],
  ['Questions', 'inversion', 'inversion (basic awareness)'],
  ['Expressions', 'greetings', 'bonjour / salut'],
  ['Expressions', 'courtesy', 'ça va / oui / non / merci / de rien'],
  ['Expressions', 'requests', "s’il te plaît / s’il vous plaît / parce que / et"],
  ['Prepositions', 'common', 'à, de, avec, pour'],
  ['Numbers & time', 'numbers', '0–100'],
  ['Numbers & time', 'calendar', 'days of the week / aujourd’hui'],
  ['Talking about yourself', 'identity', "je m'appelle / je suis / je travaille"],
  ['Talking about yourself', 'plans', "j'ai / je vais"],
  ['Gender', 'nouns', 'masculine/feminine awareness'],
  ['Listening & speaking', 'comprehension', 'understand slow speech / respond with simple sentences']
];
const insertTopic = db.prepare(`INSERT OR IGNORE INTO learning_topics
  (id, cefr_section, category, title, item, source_id) VALUES (?, 'A1', ?, ?, ?, ?)`);
for (const [category, title, item] of topicRows) insertTopic.run(stableId(`a1:${category}:${title}:${item}`), category, title, item, topicSource);

const counts = db.prepare(`
  SELECT cefr_section AS section, COUNT(*) AS examples
  FROM example_sentences
  GROUP BY cefr_section
  ORDER BY cefr_section
`).all();

console.log(`Imported ${selected.length} UD French GSD sentences from ${SOURCE.rawUrl}`);
console.table(counts);

async function downloadText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'franco-learning-importer' } });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  return response.text();
}

function parseConllu(text) {
  return text
    .split(/\n\s*\n/g)
    .map((block) => parseSentenceBlock(block))
    .filter(Boolean);
}

function parseSentenceBlock(block) {
  const metadata = {};
  const tokens = [];

  for (const line of block.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const match = line.match(/^#\s*([^=]+?)\s*=\s*(.*)$/);
      if (match) metadata[match[1].trim()] = match[2].trim();
      continue;
    }

    const columns = line.split('\t');
    if (columns.length < 8 || columns[0].includes('-') || columns[0].includes('.')) continue;
    tokens.push({
      id: columns[0],
      form: columns[1],
      lemma: columns[2],
      upos: columns[3],
      feats: columns[5],
      head: columns[6],
      deprel: columns[7]
    });
  }

  const text = metadata.text;
  if (!text || !tokens.length) return null;
  return {
    sentId: metadata.sent_id || stableId(text),
    text,
    tokens
  };
}

function analyze(sentence) {
  const wordTokens = sentence.tokens.filter((token) => /^[\p{L}'’-]+$/u.test(token.form));
  const uposCounts = countBy(wordTokens.map((token) => token.upos));
  const lemmas = Array.from(new Set(wordTokens.map((token) => token.lemma.toLowerCase()).filter(Boolean))).slice(0, 18);
  const finiteVerbCount = wordTokens.filter((token) => token.upos === 'VERB' || token.upos === 'AUX').length;
  const hasSubordination = wordTokens.some((token) => ['SCONJ', 'PRON'].includes(token.upos) && ['que', 'qui', 'dont', 'lorsque'].includes(token.lemma.toLowerCase()));
  const rareMorphology = wordTokens.filter((token) => /Mood=Sub|Tense=Past|VerbForm=Part/.test(token.feats)).length;
  const tokenCount = wordTokens.length;
  const score =
    tokenCount +
    finiteVerbCount * 2 +
    (uposCounts.ADP || 0) +
    (hasSubordination ? 8 : 0) +
    rareMorphology * 3;

  return {
    tokenCount,
    score,
    lemmas,
    uposCounts,
    verbCount: uposCounts.VERB || 0,
    nounCount: uposCounts.NOUN || 0,
    adjectiveCount: uposCounts.ADJ || 0,
    adpositionCount: uposCounts.ADP || 0,
    hasSubordination
  };
}

function isUsable(sentence) {
  const { tokenCount } = sentence.analysis;
  return tokenCount >= 4 && tokenCount <= 28 && !/[{}[\]|<>]/.test(sentence.text);
}

function assignSection(analysis) {
  if (analysis.score <= 9) return 'A1';
  if (analysis.score <= 15) return 'A2';
  if (analysis.score <= 23) return 'B1';
  return 'B2';
}

function makeExercises(sentence, exampleId) {
  const focus = sentence.tokens.find((token) => uposLabels[token.upos] && /^[\p{L}'’-]+$/u.test(token.form));
  const exercises = [
    {
      type: 'reading',
      prompt: `Read this ${sentence.cefrSection} sentence aloud or silently.`,
      answer: sentence.text,
      explanation: `Source example from ${SOURCE.name}.`
    },
    {
      type: 'word_order',
      prompt: 'Put the words back in order.',
      answer: sentence.text,
      choices: sentence.tokens
        .filter((token) => /^[\p{L}'’-]+$/u.test(token.form))
        .map((token) => token.form)
        .sort((a, b) => a.localeCompare(b, 'fr')),
      explanation: 'Word order is generated from the UD token sequence.'
    },
    {
      type: 'spelling',
      prompt: `Type this sentence from memory: ${sentence.text.replace(/[.!?].*$/, '')}`,
      answer: sentence.text,
      explanation: 'Spelling practice generated from an authentic UD sentence.'
    }
  ];

  if (focus) {
    exercises.push({
      type: 'grammar_focus',
      prompt: `In the sentence "${sentence.text}", what kind of word is "${focus.form}"?`,
      answer: uposLabels[focus.upos],
      choices: ['verb', 'noun', 'adjective', 'adverb'].sort(),
      explanation: `UD tags "${focus.form}" as ${focus.upos}.`
    });
  }

  return exercises;
}

function countBy(items) {
  return items.reduce((counts, item) => {
    counts[item] = (counts[item] || 0) + 1;
    return counts;
  }, {});
}

function stableId(value) {
  return createHash('sha1').update(value).digest('hex');
}
