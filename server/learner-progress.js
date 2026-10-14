import { LEARNING_SKILL_ITEM_TYPES, EXAM_SKILLS } from '../shared/learning-skills.js';

// Only these source-controlled taxonomy values are interpolated. Learner
// identities are always bound parameters, never part of the SQL string.
const itemCases = Object.entries(LEARNING_SKILL_ITEM_TYPES).map(([skill, types]) =>
  `WHEN i.item_type IN (${types.map(type => `'${type}'`).join(',')}) THEN '${skill}'`).join('\n');
const examCases = Object.entries(EXAM_SKILLS).map(([type, skill]) =>
  `WHEN LOWER(q.skill)='${type}' THEN '${skill}'`).join('\n');

// Matches the Practice inventory: published, renderable content with a
// current revision, plus the legacy exam archive. Rejected/unpublished items
// and old UD drills duplicated in the content bank are not counted.
export const PRACTICE_CATALOG_SQL = `
  SELECT 'content_item'::text AS item_kind, i.id, i.cefr_level AS level,
         CASE ${itemCases} END AS skill
  FROM content_items i
  JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision
  WHERE i.status='published'
  UNION ALL
  SELECT 'exam_question', q.id, UPPER(q.cefr_section), CASE ${examCases} END
  FROM exam_questions q`;

export const SKILL_AGGREGATES_SQL = `
  WITH catalog AS (
    ${PRACTICE_CATALOG_SQL}
    UNION ALL
    SELECT 'content_item'::text, i.id, i.cefr_level, 'parler'::text
    FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision
    WHERE i.status='published' AND i.item_type='listen_repeat'),
  answered AS (
    SELECT item_kind, COALESCE(item_id,legacy_ref) AS target_id, BOOL_OR(correct) AS correct
    FROM learning_attempts WHERE user_id=$1
    GROUP BY item_kind, COALESCE(item_id,legacy_ref)
  )
  SELECT c.skill, c.level, COUNT(*)::int AS exercises_total,
         COUNT(a.target_id)::int AS exercises_done,
         COUNT(*) FILTER (WHERE a.correct)::int AS exercises_correct
  FROM catalog c
  LEFT JOIN answered a ON a.item_kind=c.item_kind AND a.target_id=c.id
  WHERE c.skill IS NOT NULL AND c.level IN ('A1','A2','B1','B2','C1','C2')
  GROUP BY c.skill,c.level`;

export const CONCEPT_PROGRESS_SQL = `
  SELECT c.id AS concept_id,c.slug,c.title,c.level_code,
         COALESCE(m.mastery,0) AS mastery,COALESCE(m.total_attempts,0) AS total_attempts,
         m.last_practiced_at,
         CASE WHEN m.mastery>=0.8 THEN 'completed'
              WHEN COALESCE(m.total_attempts,0)>0 OR COALESCE(m.evidence_count,0)>0 OR p.concept_id IS NOT NULL THEN 'in_progress'
              ELSE 'not_started' END AS state
  FROM concepts c
  LEFT JOIN learner_concept_mastery m ON m.concept_id=c.id AND m.user_id=$1
  LEFT JOIN learner_lesson_positions p ON p.concept_id=c.id AND p.user_id=$1
  WHERE c.status='active'
  ORDER BY c.level_code NULLS LAST,c.list_order NULLS LAST,c.title,c.id`;

export const RECENT_MISTAKES_SQL = `
  SELECT a.*,COALESCE(r.prompt,q.prompt) AS prompt,
         COALESCE(i.cefr_level,q.cefr_section) AS level
  FROM learning_attempts a
  LEFT JOIN content_items i ON i.id=a.item_id AND i.status='published'
  LEFT JOIN content_revisions r ON r.item_id=i.id AND r.revision=a.revision
  LEFT JOIN exam_questions q ON a.item_kind='exam_question' AND q.id=a.legacy_ref
  WHERE a.user_id=$1 AND a.correct=FALSE
  ORDER BY a.created_at DESC,a.id DESC LIMIT 50`;

export function completeSkillAggregates(rows) {
  return Object.keys(LEARNING_SKILL_ITEM_TYPES).flatMap(skill =>
    ['A1','A2','B1','B2','C1','C2'].map(level => {
      const row = rows.find(row => row.skill===skill && row.level===level);
      const total = Number(row?.exercises_total || 0);
      const done = Number(row?.exercises_done || 0);
      return { skill,level,exercises_total:total,exercises_done:done,
        exercises_correct:Number(row?.exercises_correct || 0),percent:total ? Math.round(done/total*100) : 0 };
    }));
}

export async function getLearnerProgress(query, userId) {
  const [progress,mistakes,attempts,aggregateRows] = await Promise.all([
    query(CONCEPT_PROGRESS_SQL,[userId]),
    query(RECENT_MISTAKES_SQL,[userId]),
    query('SELECT * FROM learning_attempts WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[userId]),
    query(SKILL_AGGREGATES_SQL,[userId]),
  ]);
  return { progress,mistakes,attempts,skill_progress:completeSkillAggregates(aggregateRows) };
}
