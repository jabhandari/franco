import assert from 'node:assert/strict';
import {loadStories,validateStories} from '../server/story-content.js';
const stories=await loadStories();
assert.equal(stories.length,50);assert.equal(stories.reduce((n,s)=>n+s.questions.length,0),300);
const bands={A1:[100,125],A2:[125,160],B1:[165,195],B2:[200,235],C1:[230,275],C2:[280,335]};
for(const story of stories) {
 const words=story.text.trim().split(/\s+/).length;
 const [minimum,maximum]=bands[story.level];
 assert.ok(words>=minimum && words<=maximum, `${story.id}: ${words} words; expected ${story.level} ${minimum}–${maximum}`);
 assert.equal(story.questions.length,6,`${story.id}: expected six questions`);
}
const bad=structuredClone(stories);bad[0].questions.pop();assert.equal(validateStories(bad).valid,false);
const answer=structuredClone(stories);answer[1].questions[0].correct_option_id='missing';assert.equal(validateStories(answer).valid,false);
const order=structuredClone(stories);order[5].order_index=1;assert.equal(validateStories(order).valid,false);
const levels=structuredClone(stories);levels[0].level='C2';assert.equal(validateStories(levels).valid,false);
const duplicate=structuredClone(stories);duplicate[1].text=duplicate[0].text;assert.equal(validateStories(duplicate).valid,false);
for(const level of ['A1','A2','B1','B2','C1','C2']) {
 const batch=stories.filter(s=>s.level===level),words=batch.map(s=>s.text.split(/\s+/).length);
 console.log(`${level}: ${batch.length} stories, ${Math.min(...words)}–${Math.max(...words)} words`);
}
console.log('50 original stories and 300 answer keys passed content validation and level length bands.');
