import { createHash, randomUUID } from 'node:crypto';
export const EDITORIAL_STATES = ['draft','generated','factual_review','language_review','license_check','approved','published','revision_needed'];
const nonempty = value => typeof value === 'string' && Boolean(value.trim());
export function provenanceErrors(pack) {
  const errors=[];
  const records=[...(pack.example_items || []),...(pack.recognition || []),...(pack.guided_production || []),...(pack.mastery || []),pack.reading].filter(Boolean);
  for (const [index,item] of records.entries()) {
    const p=item.provenance;
    if (!p || !['original','adapted','source_derived','link_only'].includes(p.kind)) {errors.push(`Item ${index}: missing provenance`);continue;}
    if (p.kind==='link_only') {errors.push(`Item ${index}: link-only resources belong in references, never lesson items`);continue;}
    if (p.kind==='original') continue;
    if (!['source_url','source_author','license_id','attribution_text','reviewer_approval'].every(key=>nonempty(p[key]))) errors.push(`Item ${index}: incomplete source attribution or approval`);
    try {if (!['https:','http:'].includes(new URL(p.source_url).protocol)) throw new Error();} catch {errors.push(`Item ${index}: invalid source URL`);}
    if (!nonempty(p.republication_permission)) errors.push(`Item ${index}: explicit republication license or permission is required`);
    if (/wiktionary\.org/.test(p.source_url || '') && !/^CC-BY-SA/.test(p.license_id || '')) errors.push(`Item ${index}: Wiktionary requires share-alike attribution`);
    if (/tatoeba\.org/.test(p.source_url || '') && !p.record_license_verified) errors.push(`Item ${index}: verify the individual Tatoeba record license`);
  }
  return errors;
}
export function lessonErrors(pack) {
  const errors=[];
  for (const key of ['topic_id','level','explanation','outcome']) if (!nonempty(pack[key])) errors.push(`Missing ${key}`);
  if (!pack.outcome?.startsWith('I can ')) errors.push('Outcome must be an I can statement');
  for (const key of ['example_items','recognition','guided_production']) if (!Array.isArray(pack[key]) || pack[key].length<3 || pack[key].length>5) errors.push(`${key} requires 3–5 items`);
  if (!pack.mastery?.length) errors.push('Missing mastery check');
  for (const item of pack.example_items || []) if (!nonempty(item.french) || !nonempty(item.english)) errors.push('Examples require French and English');
  const questions=[...(pack.recognition || []),...(pack.guided_production || []),...(pack.mastery || [])];
  if (new Set(questions.map(q=>q.id)).size!==questions.length) errors.push('Duplicate question IDs');
  if (new Set(questions.map(q=>q.prompt)).size!==questions.length) errors.push('Duplicate question prompts');
  for (const q of questions) {
    if (!nonempty(q.id) || !nonempty(q.prompt) || !q.correct_answers?.length || !q.correct_answers.every(nonempty)) errors.push('Questions require IDs, prompts and answer keys');
    if (!['rule','error','remediation'].every(key=>nonempty(q.feedback?.[key]))) errors.push('Question feedback is incomplete');
    if (q.choices && (!q.correct_answers.every(a=>q.choices.some(c=>c.id===a)) || new Set(q.choices.map(c=>c.id)).size!==q.choices.length)) errors.push('Invalid choice answer key');
  }
  if (!['french','english','prompt'].every(key=>nonempty(pack.reading?.[key]))) errors.push('Missing bilingual reading activity');
  if (!nonempty(pack.realistic_use?.prompt) || !pack.realistic_use?.rubric?.length || !nonempty(pack.realistic_use?.model) || !nonempty(pack.realistic_use?.model_translation)) errors.push('Missing realistic task or model');
  if (!['rule','error','remediation'].every(key=>nonempty(pack.feedback?.[key]))) errors.push('Missing repair feedback');
  if (!(pack.review_due_policy?.initial_days>0) || !pack.review_due_policy?.subsequent_days?.every(n=>Number.isFinite(n)&&n>0)) errors.push('Missing review scheduling policy');
  return [...errors,...provenanceErrors(pack)];
}
export function transitionErrors(current,next,pack,evidence,history=[]) {
  const errors=[];
  const allowed=next==='revision_needed' || (current==='revision_needed' ? next==='generated' : EDITORIAL_STATES[EDITORIAL_STATES.indexOf(current)+1]===next);
  if (!EDITORIAL_STATES.includes(current) || !EDITORIAL_STATES.includes(next) || !allowed) errors.push('Editorial states must be completed in order');
  if (!nonempty(evidence?.reviewer) || !nonempty(evidence?.note)) errors.push('Reviewer and review evidence are required');
  if (['approved','published'].includes(next)) {
    errors.push(...lessonErrors(pack));
    for (const state of ['factual_review','language_review','license_check']) if (!history.includes(state)) errors.push(`Missing ${state} approval for this version`);
  }
  return errors;
}
export async function reviewCurriculum(pool,topicId,input,keyId) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const row=(await client.query('SELECT * FROM curriculum_lessons WHERE topic_id=$1 FOR UPDATE',[topicId])).rows[0];
    if (!row) {await client.query('ROLLBACK');return {status:404,body:{error:'Topic not found.'}};}
    if (input.version!==row.version || input.from!==row.review_status) {await client.query('ROLLBACK');return {status:409,body:{error:'Lesson changed. Reload before reviewing.'}};}
    const hash=createHash('sha256').update(JSON.stringify(row.pack_json)).digest('hex');
    const history=(await client.query('SELECT state FROM curriculum_editorial_reviews WHERE topic_id=$1 AND version=$2 AND pack_hash=$3 AND created_at>COALESCE((SELECT MAX(created_at) FROM curriculum_editorial_reviews WHERE topic_id=$1 AND state=\'revision_needed\'),\'epoch\'::timestamptz)',[topicId,row.version,hash])).rows.map(r=>r.state);
    const errors=transitionErrors(row.review_status,input.state,row.pack_json,input,history);
    if (errors.length) {await client.query('ROLLBACK');return {status:422,body:{errors}};}
    await client.query('INSERT INTO curriculum_editorial_reviews(id,topic_id,version,pack_hash,state,reviewer,key_id,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),topicId,row.version,hash,input.state,input.reviewer,keyId,input.note]);
    await client.query('UPDATE curriculum_lessons SET review_status=$1,updated_at=NOW() WHERE topic_id=$2',[input.state,topicId]);
    await client.query('COMMIT');return {status:200,body:{topic_id:topicId,review_status:input.state}};
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}
