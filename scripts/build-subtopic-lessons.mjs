// Offline authoring tool. Emits reviewable lesson packs; never publishes or writes the database.
import { readFile, readdir, writeFile } from 'node:fs/promises';
const directory = new URL('../content/curriculum/', import.meta.url);
const topics = JSON.parse(await readFile(new URL('topics.json', directory), 'utf8'));
const source = await readFile(new URL('subtopics.source.txt', directory), 'utf8');
const authored = new Map();
let current;
for (const line of source.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  if (line.startsWith('[') && line.endsWith(']')) {
    current = line.slice(1, -1);
    if (authored.has(current)) throw new Error(`Duplicate source topic ${current}`);
    authored.set(current, []);
  } else {
    const fields = line.split('|').map(value => value.trim());
    if (!current || fields.length !== 3 || fields.some(value => !value)) throw new Error(`Invalid authored row: ${line}`);
    authored.get(current).push(fields);
  }
}
const provenance = { kind: 'original', source_url: null, source_author: 'Franco', license_id: 'original', attribution_text: 'Original Franco subtopic lesson.' };
for (const filename of (await readdir(directory)).filter(name => name.endsWith('.lessons.json'))) {
  const packs = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
  for (const pack of packs) {
    const topic = topics.find(row => row.topic_id === pack.topic_id);
    const rows = authored.get(pack.topic_id);
    if (!topic || rows?.length !== topic.subtopics.length) throw new Error(`Incomplete subtopic source: ${pack.topic_id}`);
    pack.version = 3;
    pack.review_status = 'generated';
    pack.subtopic_lessons = Object.fromEntries(topic.subtopics.map((subtopic, index) => {
      const [rule, french, english] = rows[index];
      const id = subtopic.subtopic_id;
      const feedback = { rule, error: 'Check the spelling and word order.', remediation: 'Compare your answer with the French example, then try again.' };
      const question = (suffix, prompt, answers, choices) => ({ id: `${id}-${suffix}`, prompt, ...(choices ? { choices } : {}), correct_answers: answers, feedback, provenance });
      const otherRows = rows.filter((_, i) => i !== index);
      const choices = (correct, distractors) => [...new Set([correct, ...distractors])].slice(0, 3).map((text, i) => ({ id: String(i), text }));
      const tokens = french.split(/\s+/).map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
      const last = tokens.at(-1);
      const lesson = {
        topic_id: pack.topic_id, subtopic_id: id, level: pack.level,
        outcome: `I can recognise and use ${subtopic.title.toLowerCase()} in French.`,
        explanation: rule,
        example_items: [{ french, english, provenance }],
        recognition: [
          question('meaning', `What does this mean? ${french}`, ['0'], choices(english, otherRows.map(row => row[2]))),
          question('pattern', `Which statement explains ${subtopic.title.toLowerCase()} in this lesson?`, ['0'], choices(rule, otherRows.map(row => row[0]))),
          question('order', `Which French wording matches: ${english}`, ['0'], choices(french, [tokens.toReversed().join(' '), [...tokens.slice(1), tokens[0]].join(' ')])),
        ],
        guided_production: [
          question('complete', `Complete the missing word or expression: ${tokens.slice(0, -1).join(' ')} ___. Meaning: ${english}`, [last]),
          question('write', `Write this in French using the lesson's expressions: ${english}`, [french]),
        ],
        reading: { french, english, prompt: 'Try to understand the passage. Translate if you need a hand.', provenance },
        realistic_use: {
          prompt: `Write a short situation using ${subtopic.title.toLowerCase()}.`,
          rubric: ['Make the intended meaning clear.', 'Use the lesson pattern appropriately.'],
          model: french, model_translation: english,
        },
        feedback,
        mastery: [question('build', `Build the French sentence: ${english} Word bank: ${tokens.toReversed().join(' / ')}`, [french])],
        review_status: 'generated', version: 3, review_due_policy: pack.review_due_policy,
      };
      return [id, lesson];
    }));
    // The topic overview remains available in editorial review, with honest typing instructions.
    for (const section of ['guided_production', 'mastery']) for (const question of pack[section]) {
      question.prompt = question.prompt.replace(/ Use the wording from the example, including accents and punctuation\./g, ' Use the expressions from the lesson.').replace(/, keeping accents and punctuation/g, '');
    }
    pack.reading.prompt = 'Try to understand the passage. Translate if you need a hand.';
  }
  const serialized = `${JSON.stringify(packs, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    if (serialized !== await readFile(new URL(filename, directory), 'utf8')) throw new Error(`Stale authored output: ${filename}`);
  } else await writeFile(new URL(filename, directory), serialized);
}
console.log(`Built ${topics.reduce((sum, topic) => sum + topic.subtopics.length, 0)} focused subtopic lessons across ${topics.length} topics. Packs remain generated for editorial review.`);
