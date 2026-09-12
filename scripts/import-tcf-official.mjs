import { createHash } from 'node:crypto';
import { db, migrate } from '../server/database.js';

const SOURCE = {
  id: 'france-education-international-tcf-examples',
  name: 'France Education international TCF examples',
  url: 'https://www.france-education-international.fr/en/test/exemples-epreuves-tcf',
  license: 'Free official sample page; copyright retained by France Education international',
  attribution: 'France Education international - TCF sample questions'
};

migrate();

const html = await downloadText(SOURCE.url);
const text = htmlToText(html);
const questions = parseTcfExamples(text);

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

const insertQuestion = db.prepare(`
  INSERT INTO exam_questions (
    id, source_id, external_id, exam_name, cefr_section, skill, prompt, context,
    choices_json, answer, explanation, source_url, metadata_json
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_id, external_id) DO UPDATE SET
    cefr_section = excluded.cefr_section,
    skill = excluded.skill,
    prompt = excluded.prompt,
    context = excluded.context,
    choices_json = excluded.choices_json,
    answer = excluded.answer,
    explanation = excluded.explanation,
    source_url = excluded.source_url,
    metadata_json = excluded.metadata_json
`);

db.exec('BEGIN');
try {
  insertSource.run(SOURCE.id, SOURCE.name, SOURCE.url, SOURCE.license, SOURCE.attribution);
  for (const question of questions) {
    insertQuestion.run(
      stableId(`${SOURCE.id}:${question.externalId}`),
      SOURCE.id,
      question.externalId,
      'TCF',
      question.cefrSection,
      question.skill,
      question.prompt,
      question.context,
      JSON.stringify(question.choices),
      null,
      'Official page provides sample items for familiarisation; no answer key is imported by this scraper.',
      SOURCE.url,
      JSON.stringify({ note: 'CEFR section is an app heuristic, not a TCF label.' })
    );
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const counts = db.prepare(`
  SELECT cefr_section AS section, skill, COUNT(*) AS questions
  FROM exam_questions
  WHERE source_id = ?
  GROUP BY cefr_section, skill
  ORDER BY cefr_section, skill
`).all(SOURCE.id);

console.log(`Imported ${questions.length} official TCF sample questions from ${SOURCE.url}`);
console.table(counts);

async function downloadText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'franco-learning-importer' } });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  return response.text();
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h2|h3|li|tr|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function parseTcfExamples(text) {
  const examples = [];
  const blocks = text.split(/(?=Exemple\s+\d+)/i).filter((block) => /^Exemple\s+\d+/i.test(block.trim()));

  for (const block of blocks) {
    const number = Number(block.match(/^Exemple\s+(\d+)/i)?.[1]);
    const choices = extractChoices(block);
    const prompt = extractPrompt(block);
    if (!number || choices.length < 2 || !prompt) continue;

    examples.push({
      externalId: `tcf-example-${number}`,
      cefrSection: inferSection(number),
      skill: inferSkill(number),
      prompt,
      context: compact(block.replace(/^Exemple\s+\d+/i, '').slice(0, 900)),
      choices
    });
  }

  return examples;
}

function extractChoices(block) {
  const matches = Array.from(block.matchAll(/(?:^|\s)([A-D])\.\s*([^ABCD\n][\s\S]*?)(?=\s+[A-D]\.|Cochez|Vérifier|$)/g));
  return matches
    .map((match) => ({ key: match[1], text: compact(match[2]) }))
    .filter((choice) => choice.text.length > 0)
    .slice(0, 4);
}

function extractPrompt(block) {
  const direct = block.match(/(?:vous lisez|Vous entendez)\s*:\s*([\s\S]*?)(?=\s+A\.|\nA\.|Cochez|Vérifier|$)/i)?.[1];
  if (direct) return compact(direct);
  return compact(block.split(/\s+A\./)[0].replace(/^Exemple\s+\d+/i, ''));
}

function inferSkill(number) {
  if (number <= 10) return 'listening';
  if (number <= 30) return 'reading';
  return 'language_structures';
}

function inferSection(number) {
  if (number <= 8) return 'A1';
  if (number <= 16) return 'A2';
  if (number <= 24) return 'B1';
  return 'B2';
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function stableId(value) {
  return createHash('sha1').update(value).digest('hex');
}
