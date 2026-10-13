const assert = { equal(actual: string | number, expected: string | number) {if (actual !== expected) throw new Error(`${actual} !== ${expected}`);}, notEqual(actual: number, expected: number) {if (actual === expected) throw new Error('Values should differ');} };
import { lessonState, roadmapPositions } from './roadmap.presenter';
import type { ContentConcept } from '../api/client';
import type { ConceptProgress } from '../types';
function concept(slug:string,parents:string[]=[]):ContentConcept {return {id:slug,slug,title:slug,description:null,concept_type:'grammar',level_code:'A1',parent_id:null,status:'active',prerequisites:parents,metadata:{stub:false,theory:[],vocabulary:[],examples:[],sources:[]}};}
function progress(slug:string,state:ConceptProgress['state']):ConceptProgress {return {concept_id:slug,slug,title:slug,level_code:'A1',state,mastery:state==='completed'?1:.3,total_attempts:4,last_practiced_at:null};}
const root=concept('root'), child=concept('child',['root']), branch=concept('branch',['root']);
assert.equal(lessonState(root,null),'unavailable');
assert.equal(lessonState(root,[]),'not_started');
assert.equal(lessonState(child,[]),'not_started');
assert.equal(lessonState(child,[progress('root','completed')]),'not_started');
assert.equal(lessonState(child,[progress('child','in_progress')]),'in_progress');
assert.equal(lessonState(child,[progress('child','completed')]),'completed');
assert.equal(lessonState(concept('later',['prior-level']),[progress('prior-level','completed')]),'not_started');
assert.equal(lessonState(concept('later',['prior-level']),[]),'not_started');
const positions=roadmapPositions([root,child,branch]);
assert.equal(positions.get('root')?.row,1);
assert.equal(positions.get('child')?.row,2);
assert.equal(positions.get('branch')?.row,2);
assert.notEqual(positions.get('branch')?.column,positions.get('child')?.column);
assert.equal(roadmapPositions(Array.from({length:6},(_,i)=>concept(String(i)))).get('5')?.row,2);
assert.equal(roadmapPositions([concept('a',['b']),concept('b',['a'])]).size,2);
console.log('roadmap presenter checks passed');
