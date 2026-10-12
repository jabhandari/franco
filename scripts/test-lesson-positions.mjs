import assert from 'node:assert/strict';
import { getLessonPosition,saveLessonPosition } from '../server/lesson-positions.js';

let queried=false;
const forbidden=async () => { queried=true; throw new Error('Should not query'); };
assert.equal((await saveLessonPosition(forbidden,'user','concept','invalid')).status,400);
assert.equal((await saveLessonPosition(forbidden,'user',null,'theory')).status,400);
assert.equal(queried,false);
const saved=await saveLessonPosition(async(sql,params) => {
  assert.deepEqual(params,['user','concept-slug','examples']);
  return [{section:'examples'}];
},'user','concept-slug','examples');
assert.deepEqual(saved,{status:200,saved:true});
assert.equal((await saveLessonPosition(async()=>[],'user','missing','theory')).status,404);
assert.deepEqual(await getLessonPosition(async(sql,params)=>{
  assert.deepEqual(params,['user']); return [];
},'user'),{lesson:null});
const lesson={slug:'etre',section:'examples',position:3,total:15};
assert.deepEqual(await getLessonPosition(async()=>[lesson],'user'),{lesson});
console.log('lesson positions tests passed');
