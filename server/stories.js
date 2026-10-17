import {randomInt} from 'node:crypto';
export async function loadStoryCatalog() {
  try { const {loadStories}=await import('./story-content.js');return await loadStories(); }
  catch(error) {if(error.code==='ERR_MODULE_NOT_FOUND' && error.message.includes('story-content.js')) return [];throw error;}
}
export function storyPath(catalog,progress) {
  const byId=new Map(progress.map(row=>[row.story_id,row]));
  return [...catalog].sort((a,b)=>a.order_index-b.order_index).map(story=>{
    const row=byId.get(story.id);
    const state=['completed','skipped'].includes(row?.state)?row.state:'current';
    return {id:story.id,title:story.title,title_en:story.title_en,level:story.level,order_index:story.order_index,state,answered:row?.version===story.version?row.answered_question_ids.length:0};
  });
}
function shuffledOptions(options) {
  const shuffled=options.map(option=>({...option}));
  for(let i=shuffled.length-1;i>0;i--) {const j=randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return shuffled;
}
function safeStory(story,progress) {
  return {id:story.id,title:story.title,title_en:story.title_en,level:story.level,text:story.text,glossary:story.glossary,version:story.version,
    questions:story.questions.map(({id,prompt,options})=>({id,prompt,options:shuffledOptions(options)})),answered_question_ids:progress?.version===story.version?progress.answered_question_ids:[]};
}
const failure=(status,error)=>({status,body:{error}});
export function createStoryService(pool,loadCatalog=loadStoryCatalog) {
  async function context(client,userId) {
    const catalog=await loadCatalog();
    const progress=(await client.query('SELECT story_id,version,state,answered_question_ids FROM learner_story_progress WHERE user_id=$1',[userId])).rows;
    return {catalog,progress,path:storyPath(catalog,progress)};
  }
  return {
    async list(userId) {const {path}=await context(pool,userId);return {status:200,body:{stories:path}};},
    async detail(userId,id) {
      const {catalog,progress,path}=await context(pool,userId),node=path.find(s=>s.id===id);
      if(!node) return failure(404,'Story not found.');
      return {status:200,body:{story:safeStory(catalog.find(s=>s.id===id),progress.find(p=>p.story_id===id)),state:node.state}};
    },
    async act(userId,id,action,input) {
      if(!input || !Number.isInteger(input.version)) return failure(400,'A story version is required.');
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize progress writes for this learner, including first-time rows.
        const owner=(await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
        if(!owner) {await client.query('ROLLBACK');return failure(401,'Authentication required.');}
        const {catalog,progress,path}=await context(client,userId),story=catalog.find(s=>s.id===id),node=path.find(s=>s.id===id);
        const stop=async(status,message)=>{await client.query('ROLLBACK');return failure(status,message);};
        if(!story) return await stop(404,'Story not found.');
        if(input.version!==story.version) return await stop(409,'This story changed. Reload before answering.');
        const row=progress.find(p=>p.story_id===id),answered=new Set(row?.version===story.version?row.answered_question_ids:[]);
        let state=node.state,correct=null,explanation=null;
        if(action==='answer') {
          const question=story.questions.find(q=>q.id===input.question_id);
          if(!question || !question.options.some(o=>o.id===input.option_id)) return await stop(400,'Choose an option for a valid question.');
          correct=question.correct_option_id===input.option_id;
          if(correct) answered.add(question.id);
          explanation=correct?question.explanation:'Not quite. Reread the story and try again; there is no retry limit.';
          if(state!=='completed' && answered.size===story.questions.length) state='completed';
        } else if(action==='skip') {
          // Skipping the questions is a reading-session exit, not progress:
          // saved answers are kept and a completed story stays completed.
          if(state!=='completed') state='skipped';
        } else return await stop(400,'Unsupported story action.');
        await client.query(`INSERT INTO learner_story_progress(user_id,story_id,version,state,answered_question_ids) VALUES($1,$2,$3,$4,$5)
          ON CONFLICT(user_id,story_id) DO UPDATE SET version=EXCLUDED.version,state=EXCLUDED.state,answered_question_ids=EXCLUDED.answered_question_ids,updated_at=NOW()`,[userId,id,story.version,state,[...answered]]);
        await client.query('COMMIT');
        return {status:200,body:{story_id:id,state,correct,explanation,answered_question_ids:[...answered]}};
      } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
    }
  };
}
