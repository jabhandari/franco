import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { lessonErrors } from '../server/curriculum-editorial.js';
import { curriculumConcepts } from '../server/curriculum-contract.js';
const directory = new URL('../content/curriculum/', import.meta.url);
const topics = JSON.parse(await readFile(new URL('topics.json', directory), 'utf8'));
const packs = (await Promise.all((await readdir(directory)).filter(name => name.endsWith('.lessons.json')).map(async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'))))).flat();
assert.equal(packs.length, 90);
const explanations = new Set();
const examples = new Set();
const questionIds = new Set();
let total = 0;
for (const topic of topics) {
  const pack = packs.find(row => row.topic_id === topic.topic_id);
  assert.ok(pack, topic.topic_id);
  assert.deepEqual(lessonErrors(pack), [], topic.topic_id);
  assert.deepEqual(Object.keys(pack.subtopic_lessons), topic.subtopics.map(row => row.subtopic_id));
  for (const subtopic of topic.subtopics) {
    const lesson = pack.subtopic_lessons[subtopic.subtopic_id];
    assert.equal(lesson.level, topic.level);
    assert.equal(lesson.subtopic_id, subtopic.subtopic_id);
    assert.equal(lesson.review_status, 'generated');
    assert.ok(!explanations.has(lesson.explanation), `Repeated explanation: ${subtopic.subtopic_id}`);
    explanations.add(lesson.explanation);
    assert.ok(!examples.has(lesson.example_items[0].french), `Repeated example: ${subtopic.subtopic_id}`);
    examples.add(lesson.example_items[0].french);
    const questions = [...lesson.recognition, ...lesson.guided_production, ...lesson.mastery];
    for (const question of questions) {
      assert.ok(!questionIds.has(question.id), `Repeated ID: ${question.id}`);
      questionIds.add(question.id);
      assert.ok(!/including accents and punctuation|keeping accents and punctuation/.test(question.prompt));
      if (question.choices) {
        assert.ok(question.choices.length >= 2);
        assert.equal(new Set(question.choices.map(choice => choice.text)).size, question.choices.length);
        assert.ok(question.correct_answers.every(answer => question.choices.some(choice => choice.id === answer)));
      }
    }
    total++;
  }
  const concepts = [{ slug: topic.topic_id, metadata_json: {} }];
  const privateResult = await curriculumConcepts(async () => [{ topic_id: topic.topic_id, review_status: 'generated', pack_json: pack }], concepts);
  assert.equal(privateResult[0].metadata_json.lesson, undefined);
  const publicResult = await curriculumConcepts(async () => [{ topic_id: topic.topic_id, review_status: 'published', pack_json: pack }], concepts);
  assert.equal(publicResult[0].metadata_json.subtopic_lessons, undefined, 'Avoid duplicating the collection in metadata');
  for (const lesson of Object.values(publicResult[0].metadata_json.lesson.subtopic_lessons)) assert.equal(lesson.review_status, 'published');
}
assert.equal(total, 364);
const malformed = structuredClone(packs[0]);
Object.values(malformed.subtopic_lessons)[0].mastery[0].correct_answers = [];
assert.ok(lessonErrors(malformed).some(error => error.includes('answer keys')));
console.log(`Subtopic lessons: ${total} unique lessons across 90 topics, A1–C2; editorial validation, choice keys and published-only projection passed.`);
