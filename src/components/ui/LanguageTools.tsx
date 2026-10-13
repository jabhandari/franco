import React from 'react';
import { Accessibility, Check, Circle, ArrowRightLeft, Volume2, X, Trash2 } from 'lucide-react';
import type { TranslationResult, DiaryEntry } from '../../types';

type SelectionResult = {result:TranslationResult|null;x:number;y:number;loading:boolean;error:string;saved:boolean};
type LanguageToolsProps = {
  menu:boolean;panel:'translator'|'diary'|null;mode:'translate'|'diary'|null;selection:SelectionResult|null;
  input:string;source:'fr'|'en';result:TranslationResult|null;loading:boolean;error:string;status:string;
  diary:DiaryEntry[];recents:TranslationResult[];
  onMenu:()=>void;onClose:()=>void;onMode:(mode:'translate'|'diary')=>void;onPanel:(panel:'translator'|'diary')=>void;
  onInput:(value:string)=>void;onSwap:()=>void;onTranslate:()=>void;onSave:(result:TranslationResult)=>void;
  onSpeak:(text:string,language:'fr'|'en')=>void;onRemove:(id:string)=>void;onRecent:(result:TranslationResult)=>void;
};
export function LanguageTools(props:LanguageToolsProps) {
  const root=React.useRef<HTMLDivElement>(null);
  const opener=React.useRef<HTMLButtonElement>(null);
  const panel=React.useRef<HTMLDivElement>(null);
  const actions=React.useRef(props);actions.current=props;
  React.useEffect(()=>{
    function escape(event:KeyboardEvent) {
      if(event.key==='Escape' && (actions.current.panel || actions.current.menu || actions.current.selection)) {event.stopImmediatePropagation();actions.current.onClose();opener.current?.focus();}
      if(event.key==='Tab' && actions.current.panel) {
        const controls:HTMLElement[]=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,[tabindex="0"]') || []);
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
      }
    }
    document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);
  },[]);
  React.useEffect(()=>{
    if(props.panel) panel.current?.querySelector<HTMLElement>('button,input')?.focus();
    else if(props.menu) root.current?.querySelector<HTMLElement>('.language-menu button')?.focus();
  },[props.panel,props.menu]);
  React.useEffect(()=>{
    if(!props.panel) return;
    const background:HTMLElement[]=Array.from(document.querySelectorAll<HTMLElement>('.app-shell > aside,.app-shell > main,.phone-tabs'));
    const previous=background.map(element=>element.inert);
    background.forEach(element=>{element.inert=true;});
    return()=>{background.forEach((element,index)=>{element.inert=previous[index];});if(opener.current?.isConnected) opener.current.focus();};
  },[props.panel]);
  const selection=props.selection;
  const check=(on:boolean)=>on ? <span className="language-check"><Check size={13} aria-hidden="true"/></span> : <Circle size={19} aria-hidden="true"/>;
  function resultBlock(result:TranslationResult) {
    return <div className="language-result"><p>{result.translation}</p><div><button type="button" onClick={()=>props.onSpeak(result.translation,result.target)}><Volume2 size={15} aria-hidden="true"/> Pronounce</button><button type="button" onClick={()=>props.onSave(result)}>+ Add to diary</button></div></div>;
  }
  return <div className="language-tools" ref={root}>
    <button type="button" ref={opener} className="language-tools-button" aria-label="Accessibility tools" aria-expanded={props.menu || Boolean(props.panel)} onClick={props.onMenu}><Accessibility size={22} aria-hidden="true"/>{props.mode && <span className="language-mode-dot"/>}</button>
    {props.menu && <div className="language-menu" role="group" aria-label="Accessibility tools menu">
      <button type="button" role="checkbox" aria-checked={props.mode==='translate'} className={props.mode==='translate' ? 'checked' : ''} onClick={()=>props.onMode('translate')}>Translate selection {check(props.mode==='translate')}</button>
      <button type="button" role="checkbox" aria-checked={props.mode==='diary'} className={props.mode==='diary' ? 'checked' : ''} onClick={()=>props.onMode('diary')}>Add to diary {check(props.mode==='diary')}</button>
      <button type="button" onClick={()=>props.onPanel('translator')}>Translator <span aria-hidden="true">›</span></button><button type="button" onClick={()=>props.onPanel('diary')}>My diary <small>{props.diary.length} entries</small></button>
    </div>}
    {selection && <div className="language-bubble" role="status" style={{left:Math.max(12,Math.min(selection.x,window.innerWidth-302)),top:Math.max(12,Math.min(selection.y,window.innerHeight-340))}}>
      <button type="button" className="language-close" aria-label="Close translation" onClick={props.onClose}><X size={16}/></button>
      {selection.loading ? <p>Translating…</p> : selection.error ? <p>{selection.error}</p> : selection.result && <><small>{selection.result.source.toUpperCase()} → {selection.result.target.toUpperCase()}</small><strong>{selection.result.text}</strong>{resultBlock(selection.result)}{selection.saved && <small>Saved to diary</small>}{props.status && props.status !== 'Saved to diary' && <small>{props.status}</small>}</>}
    </div>}
    {props.panel && <div className="language-panel" ref={panel} role="dialog" aria-modal="true" aria-label={props.panel==='translator' ? 'Translator' : 'My diary'}>
      <button type="button" className="language-close" aria-label="Close language tools" onClick={props.onClose}><X size={18}/></button>
      <h2>{props.panel==='translator' ? 'Translator' : 'My diary'}</h2>
      {props.panel==='translator' ? <>
        <div className="language-directions"><span>{props.source==='fr' ? 'Français' : 'English'}</span><button type="button" aria-label="Swap translation direction" onClick={props.onSwap}><ArrowRightLeft size={17}/></button><span>{props.source==='fr' ? 'English' : 'Français'}</span></div>
        <form onSubmit={event=>{event.preventDefault();props.onTranslate();}}><label>Word or short phrase<textarea rows={3} value={props.input} maxLength={240} onChange={event=>props.onInput(event.target.value)} placeholder="je suis allée"/></label><button className="primary-button" type="submit" disabled={props.loading || !props.input.trim()}>{props.loading ? 'Translating…' : 'Translate'}</button></form>
        {props.result && resultBlock(props.result)}<h3>Recent</h3><div className="language-recents">{props.recents.length ? props.recents.map((row,index)=><button type="button" key={index} onClick={()=>props.onRecent(row)}><span>{row.text}</span><span>{row.translation}</span></button>) : <p>Your recent lookups will appear here.</p>}</div>
      </> : <><p className="language-note">A notebook of words and meanings. Saved in this browser for your account.</p><div className="language-diary">{props.diary.length ? props.diary.map(row=><article key={row.id}><strong>{row.text}</strong><p>{row.translation}</p><div><button type="button" onClick={()=>props.onSpeak(row.text,row.source)} aria-label={`Pronounce ${row.text}`}><Volume2 size={16}/></button><button type="button" onClick={()=>props.onRemove(row.id)} aria-label={`Remove ${row.text}`}><Trash2 size={16}/></button></div></article>) : <p>Your diary is empty. Save a translation to begin.</p>}</div></>}
      {(props.error || props.status) && <p role="status" className="language-status">{props.error || props.status}</p>}
    </div>}
  </div>;
}
