export function validateCurriculumTopic(topic) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  need(/^(A1|A2|B1|B2|C1|C2)-(0[1-9]|1[0-5])$/.test(topic?.topic_id), 'Invalid topic_id');
  need(topic?.level === topic?.topic_id?.slice(0, 2), 'Level must match topic_id');
  need(typeof topic?.topic_title === 'string' && topic.topic_title.trim(), 'Missing topic_title');
  need(Number.isInteger(topic?.order_index) && topic.order_index >= 0, 'Invalid order_index');
  need(Array.isArray(topic?.subtopics) && topic.subtopics.length > 0 && topic.subtopics.every(s => typeof s.subtopic_id === 'string' && typeof s.title === 'string' && s.title.trim()), 'Missing subtopics');
  need(Array.isArray(topic?.prerequisite_concept_ids) && topic.prerequisite_concept_ids.every(id => typeof id === 'string' && id !== topic.topic_id), 'Invalid prerequisites');
  return { valid: !errors.length, errors };
}
export async function curriculumConcepts(query, concepts) {
  const curriculum = concepts.filter(c => /^(A1|A2|B1|B2|C1|C2)-\d{2}$/.test(c.slug));
  if (!curriculum.length) return concepts;
  const lessons = await query('SELECT topic_id,review_status,pack_json FROM curriculum_lessons');
  const byTopic = new Map(lessons.map(l => [l.topic_id, l]));
  return curriculum.map(c => {
    const lesson = byTopic.get(c.slug);
    const published = lesson?.review_status === 'published';
    if (!published) return { ...c, metadata_json: { ...c.metadata_json, review_status: lesson?.review_status || 'draft', stub: true } };
    // Keep the large subtopic collection only inside `lesson`, not duplicated
    // at the metadata root. Parent publication covers the validated children.
    const { subtopic_lessons, ...overview } = lesson.pack_json;
    const questions = [...overview.recognition, ...overview.guided_production, ...overview.mastery];
    const publishedPack = {
      ...overview,
      ...(subtopic_lessons ? { subtopic_lessons: Object.fromEntries(Object.entries(subtopic_lessons).map(([id, pack]) => [id, { ...pack, review_status: 'published' }])) } : {}),
      review_status: 'published',
    };
    return { ...c, metadata_json: {
      ...c.metadata_json, ...overview, review_status: 'published', stub: false,
      question_items: questions, correct_answers: questions.map(question => question.correct_answers),
      lesson: publishedPack,
    } };
  });
}
