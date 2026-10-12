export const LESSON_SECTIONS = new Set(['overview','theory','vocabulary','examples']);

export async function getLessonPosition(query,userId) {
  const rows=await query(`WITH lessons AS (
    SELECT id,slug,title,level_code,
           ROW_NUMBER() OVER(PARTITION BY level_code ORDER BY list_order NULLS LAST,title,id)::int AS position,
           COUNT(*) OVER(PARTITION BY level_code)::int AS total
    FROM concepts WHERE status='active' AND level_code IS NOT NULL
  ) SELECT c.slug,c.title,c.level_code,c.position,c.total,p.section,p.updated_at
    FROM learner_lesson_positions p JOIN lessons c ON c.id=p.concept_id
    WHERE p.user_id=$1 ORDER BY p.updated_at DESC,p.concept_id LIMIT 1`,[userId]);
  return {lesson:rows[0] || null};
}

export async function saveLessonPosition(query,userId,slug,section) {
  if (typeof slug!=='string' || !LESSON_SECTIONS.has(section)) return {status:400,error:'Choose a valid lesson and section.'};
  const rows=await query(`INSERT INTO learner_lesson_positions(user_id,concept_id,section)
    SELECT $1,id,$3 FROM concepts WHERE slug=$2 AND status='active' AND level_code IS NOT NULL
    ON CONFLICT(user_id,concept_id) DO UPDATE SET section=EXCLUDED.section,updated_at=NOW()
    RETURNING section,updated_at`,[userId,slug,section]);
  return rows.length ? {status:200,saved:true} : {status:404,error:'Lesson not found.'};
}
