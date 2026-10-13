import React from 'react';
import { apiPost } from '../api/client';
import type { TranslationResult } from '../types';
import { useNotebook } from '../hooks/useNotebook';
import { LanguageTools as Tools } from './ui';

type SelectionState = {result:TranslationResult|null;x:number;y:number;loading:boolean;error:string;saved:boolean};
type LanguageToolsProps = {userId:string;token:string|null;page:string;key?:React.Key};
export function LanguageTools({userId,token,page}:LanguageToolsProps) {
  const notebook=useNotebook(userId);
  const [menu,setMenu]=React.useState(false);
  const [panel,setPanel]=React.useState<'translator'|'diary'|null>(null);
  const [mode,setMode]=React.useState<'translate'|'diary'|null>(null);
  const [selection,setSelection]=React.useState<SelectionState|null>(null);
  const [input,setInput]=React.useState('');
  const [source,setSource]=React.useState<'fr'|'en'>('fr');
  const [result,setResult]=React.useState<TranslationResult|null>(null);
  const [recents,setRecents]=React.useState<TranslationResult[]>([]);
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState('');
  const [status,setStatus]=React.useState('');
  const generation=React.useRef(0);
  const lastSelection=React.useRef('');
  const panelGeneration=React.useRef(0);
  React.useEffect(()=>{generation.current++;setSelection(null);lastSelection.current='';},[page,mode]);
  React.useEffect(()=>()=>{generation.current++;panelGeneration.current++;},[]);
  function remember(value:TranslationResult) {setRecents(rows=>[value,...rows.filter(row=>row.text!==value.text || row.source!==value.source)].slice(0,6));}
  function save(value:TranslationResult) {
    const saved=notebook.save(value);setStatus(saved ? 'Saved to diary' : 'Your diary could not be saved.');
    if(saved) setSelection(current=>current && current.result===value ? {...current,saved:true} : current);
  }
  React.useEffect(()=>{
    if(!mode) return;
    function selected(event:MouseEvent|KeyboardEvent) {
      if(event instanceof KeyboardEvent && !['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      if(event.target instanceof Element && event.target.closest('button,input,textarea,select,a,.language-tools,[contenteditable="true"]')) return;
      const chosen=window.getSelection();const text=chosen?.toString().trim() || '';
      if(!text || text.length>240 || !chosen?.rangeCount || text===lastSelection.current) return;
      const container=chosen.getRangeAt(0).commonAncestorContainer;
      const element=container instanceof Element ? container : container.parentElement;
      if(element?.closest('button,input,textarea,select,a,.language-tools,[contenteditable="true"]')) return;
      lastSelection.current=text;const rect=chosen.getRangeAt(0).getBoundingClientRect();const request=++generation.current;
      setMenu(false);setSelection({result:null,x:rect.left,y:rect.bottom+8,loading:true,error:'',saved:false});
      apiPost<TranslationResult>('/api/me/translate',{text,source:'auto'},token).then(value=>{
        if(request!==generation.current) return;
        const saved=mode==='diary' ? notebook.save(value) : false;
        remember(value);setSelection({result:value,x:rect.left,y:rect.bottom+8,loading:false,error:'',saved});
      }).catch(error=>{if(request===generation.current) setSelection({result:null,x:rect.left,y:rect.bottom+8,loading:false,error:error instanceof Error ? error.message : 'Could not translate this selection.',saved:false});});
    }
    document.addEventListener('mouseup',selected);document.addEventListener('keyup',selected);
    return()=>{document.removeEventListener('mouseup',selected);document.removeEventListener('keyup',selected);};
  },[mode,token]);
  async function translate() {
    if(loading || !input.trim()) return;
    const request=++panelGeneration.current;setLoading(true);setError('');setStatus('');setResult(null);
    try {const value=await apiPost<TranslationResult>('/api/me/translate',{text:input,source},token);if(request===panelGeneration.current) {setResult(value);remember(value);}}
    catch(error) {if(request===panelGeneration.current) setError(error instanceof Error ? error.message : 'Could not translate this phrase.');}
    finally {if(request===panelGeneration.current) setLoading(false);}
  }
  function changeInput(value:string) {panelGeneration.current++;setLoading(false);setInput(value);setResult(null);setError('');setStatus('');}
  function swap() {const next=result?.translation || '';changeInput(next);setSource(value=>value==='fr'?'en':'fr');}
  function close() {generation.current++;setMenu(false);setPanel(null);setSelection(null);lastSelection.current='';}
  function speak(text:string,language:'fr'|'en') {
    if(!window.speechSynthesis || typeof SpeechSynthesisUtterance==='undefined') {setStatus('Pronunciation is unavailable on this browser.');return;}
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang=language==='fr' ? 'fr-FR' : 'en-US';utterance.onerror=()=>setStatus('Pronunciation is unavailable on this device.');window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
  }
  return <Tools menu={menu} panel={panel} mode={mode} selection={selection} input={input} source={source} result={result} loading={loading} error={error || notebook.error} status={status} diary={notebook.entries} recents={recents}
    onMenu={()=>{generation.current++;setSelection(null);setMenu(value=>!value);setPanel(null);}} onClose={close}
    onMode={next=>{setMode(value=>value===next ? null : next);setStatus('');}}
    onPanel={next=>{generation.current++;setMenu(false);setSelection(null);setPanel(next);setStatus('');setError('');}}
    onInput={changeInput} onSwap={swap} onTranslate={translate} onSave={save} onSpeak={speak} onRemove={notebook.remove}
    onRecent={value=>{changeInput(value.text);setSource(value.source);setResult(value);}}/>
  ;
}
