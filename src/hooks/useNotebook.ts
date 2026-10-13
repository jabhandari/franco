import React from 'react';
import type { DiaryEntry, TranslationResult } from '../types';
import type { JsonValue } from '../api/client';
function entry(value:JsonValue):value is DiaryEntry {
  return Boolean(value && typeof value==='object' && !Array.isArray(value) && typeof value.id==='string' && typeof value.saved_at==='string' && typeof value.text==='string' && typeof value.translation==='string' && (value.source==='fr' || value.source==='en') && (value.target==='fr' || value.target==='en'));
}
export function useNotebook(userId:string) {
  const key=`franco_diary_${userId}`;
  const [error,setError]=React.useState('');
  const [entries,setEntries]=React.useState<DiaryEntry[]>(()=>{
    try {const parsed:JsonValue=JSON.parse(localStorage.getItem(key) || '[]');return Array.isArray(parsed) ? parsed.filter(entry) : [];} catch {return [];}
  });
  const current=React.useRef(entries);
  function persist(next:DiaryEntry[]) {
    try {localStorage.setItem(key,JSON.stringify(next));current.current=next;setEntries(next);setError('');return true;}
    catch {setError('Your diary could not be saved on this browser. Check that storage is available.');return false;}
  }
  function save(result:TranslationResult) {
    if(current.current.some(row=>row.text.toLocaleLowerCase()===result.text.toLocaleLowerCase() && row.source===result.source)) return true;
    return persist([{...result,id:crypto.randomUUID(),saved_at:new Date().toISOString()},...current.current]);
  }
  function remove(id:string) {persist(current.current.filter(row=>row.id!==id));}
  return {entries,error,save,remove};
}
