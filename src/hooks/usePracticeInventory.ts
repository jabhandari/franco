import React from 'react';
import { apiGet } from '../api/client';
import type { ContentItemsResponse, ContentReviewQueueItem, ExamQuestion, ExamQuestionsResponse } from '../api/client';
import type { SkillId, CefrLevel } from '../types';
import { skillForItemType } from '../presenters/learn.presenter';
import { getErrorMessage } from '../presenters/format.presenter';
import { EXAM_SKILLS } from '../../shared/learning-skills';

type InventoryState = {key?:string;items:ContentReviewQueueItem[];questions:ExamQuestion[];loading:boolean;error:string};
export function usePracticeInventory(skill:SkillId,level:CefrLevel,enabled:boolean,token?:string|null) {
  const [state,setState]=React.useState<InventoryState>({items:[],questions:[],loading:false,error:''});
  React.useEffect(()=>{
    if(!enabled) return;
    let cancelled=false;
    const key=`${skill}:${level}`;
    setState({key,items:[],questions:[],loading:true,error:''});
    async function loadContent() {
      const items:ContentReviewQueueItem[]=[];
      let offset=0;
      while(true) {
        const page=await apiGet<ContentItemsResponse>(`/api/content/v1/items?level=${level}&limit=100&offset=${offset}`,token);
        items.push(...page.items);
        offset+=page.items.length;
        if(offset>=page.total) break;
        if(!page.items.length) throw new Error('The exercise inventory changed while loading. Please try again.');
        if(cancelled) return [];
      }
      return items.filter(item=>skillForItemType(item.type)===skill);
    }
    Promise.all([loadContent(),apiGet<ExamQuestionsResponse>(`/api/exam/questions?section=${level}`,token)])
      .then(([items,exam])=>{
        const skills:Record<string,string>=EXAM_SKILLS;
        const questions=exam.questions.filter(question=>skills[question.skill.trim().toLowerCase()]===skill);
        if(!cancelled) setState({key,items,questions,loading:false,error:''});
      }).catch(error=>{if(!cancelled) setState({key,items:[],questions:[],loading:false,error:error instanceof Error ? getErrorMessage(error) : 'Could not load exercises.'});});
    return()=>{cancelled=true;};
  },[enabled,skill,level,token]);
  return enabled && state.key!==`${skill}:${level}` ? {items:[],questions:[],loading:true,error:''} : state;
}
