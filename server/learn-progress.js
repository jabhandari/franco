const LEVELS = new Set(['A1','A2','B1','B2','C1','C2']);
export async function getLearnProgress(query,userId,level) {
 if(!LEVELS.has(level)) return {status:400,body:{error:'Choose a valid level.'}};
 const subtopics=await query(`SELECT p.topic_id,p.subtopic_id,p.status,p.updated_at FROM learner_subtopic_progress p
  JOIN concepts c ON c.slug=p.topic_id WHERE p.user_id=$1 AND c.level_code=$2 AND c.status='active' ORDER BY p.updated_at DESC,p.topic_id,p.subtopic_id`,[userId,level]);
 return {status:200,body:{level,subtopics}};
}
export async function saveLearnProgress(query,userId,input) {
 const {topic_id,subtopic_id,status}=input ?? {};
 if(typeof topic_id!=='string' || typeof subtopic_id!=='string' || !['in_progress','completed'].includes(status)) return {status:400,body:{error:'Choose a valid topic, subtopic and progress status.'}};
 const topics=await query("SELECT metadata_json FROM concepts WHERE slug=$1 AND status='active'",[topic_id]);
 if(!topics[0]?.metadata_json?.subtopics?.some(s=>s.subtopic_id===subtopic_id)) return {status:400,body:{error:'Subtopic does not belong to this topic.'}};
 await query(`INSERT INTO learner_subtopic_progress(user_id,topic_id,subtopic_id,status) VALUES($1,$2,$3,$4)
  ON CONFLICT(user_id,topic_id,subtopic_id) DO UPDATE SET
  status=CASE WHEN learner_subtopic_progress.status='completed' THEN 'completed' ELSE EXCLUDED.status END,updated_at=NOW()`,[userId,topic_id,subtopic_id,status]);
 return {status:200,body:{saved:true}};
}
