import {readFile} from 'node:fs/promises';
export const STORY_LEVELS=['A1','A2','B1','B2','C1','C2'];
export function validateStories(stories) {
  const errors=[];
  if (!Array.isArray(stories) || stories.length!==50) return {valid:false,errors:['Exactly 50 stories are required.']};
  const ids=new Set(), texts=new Set();let priorLevel=-1;
  const text=value=>typeof value==='string' && value.trim().length>0;
  for (const [index,story] of stories.entries()) {
    const fail=message=>errors.push(`${story?.id || index}: ${message}`);
    if (!story || typeof story!=='object') {fail('Invalid record');continue;}
    if (!/^story-\d{2}$/.test(story.id) || ids.has(story.id)) fail('Invalid or duplicate id');ids.add(story.id);
    if (story.order_index!==index+1) fail('Order must be contiguous and one-based');
    const level=STORY_LEVELS.indexOf(story.level);if(level<priorLevel || level<0) fail('CEFR order must increase from A1 to C2');priorLevel=level;
    if(![story.title,story.title_en,story.text].every(text) || texts.has(story.text)) fail('Missing or duplicated story text');texts.add(story.text);
    if(!Array.isArray(story.glossary) || !story.glossary.every(g=>text(g.french)&&text(g.english))) fail('Invalid glossary');
    if(!Number.isInteger(story.version) || story.version<1 || story.provenance?.kind!=='original_ai_generated') fail('Missing version or original AI provenance');
    if(!Array.isArray(story.questions) || story.questions.length!==6) {fail('Exactly six questions are required');continue;}
    const qids=new Set(),prompts=new Set();
    for(const q of story.questions){
      if(!text(q.id) || qids.has(q.id) || !text(q.prompt) || prompts.has(q.prompt) || !text(q.explanation)) fail('Invalid or duplicated question');qids.add(q.id);prompts.add(q.prompt);
      if(!Array.isArray(q.options) || q.options.length<3 || new Set(q.options.map(o=>o.id)).size!==q.options.length || new Set(q.options.map(o=>o.text)).size!==q.options.length || !q.options.every(o=>text(o.id)&&text(o.text)) || !q.options.some(o=>o.id===q.correct_option_id)) fail('Invalid options or answer key');
    }
  }
  for(const level of STORY_LEVELS) {const count=stories.filter(s=>s.level===level).length;if(count<8 || count>9) errors.push(`${level}: expected eight or nine stories`);}
  return {valid:errors.length===0,errors};
}
export async function loadStories() {
  const stories=JSON.parse(await readFile(new URL('../content/stories/stories.v1.json',import.meta.url),'utf8'));
  const result=validateStories(stories);if(!result.valid) throw new Error(result.errors.join('; '));return stories;
}
