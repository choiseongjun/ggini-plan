'use client';
import {useEffect,useId,useState,type ReactNode} from 'react';
import './planner-fab.css';

export type FabAction={key:string;icon:ReactNode;label:string;onClick:()=>void;disabled?:boolean;primary?:boolean};

const glyph=(children:ReactNode)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;

export const fabIcons={
 overview:glyph(<><rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4"/><circle cx="8.3" cy="13.6" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="13.6" r=".9" fill="currentColor" stroke="none"/><circle cx="15.7" cy="13.6" r=".9" fill="currentColor" stroke="none"/><circle cx="8.3" cy="17" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/></>),
 reroll:glyph(<><path d="M3 7.5h3.2c2 0 3.2.9 4.3 2.6l3 4.8c1.1 1.7 2.3 2.6 4.3 2.6H21"/><path d="M3 17.5h3.2c1.3 0 2.2-.4 3-1.1M14.8 8.6c.8-.7 1.7-1.1 3-1.1H21"/><path d="m18.5 5 2.5 2.5-2.5 2.5M18.5 15l2.5 2.5-2.5 2.5"/></>),
 setup:glyph(<><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/><path d="M4 12h5M13 12h7"/><circle cx="11" cy="12" r="2.2"/></>),
 save:glyph(<><path d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5l-7-4.2-7 4.2V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="m9 10 2.2 2.2L15.3 8"/></>),
};

export function PlannerFab({actions}:{actions:FabAction[]}){
 const [open,setOpen]=useState(false);
 const menuId=useId();
 useEffect(()=>{
  if(!open)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[open]);
 return <div className={`planner-fab${open?' is-open':''}`}>
  <div className="planner-fab-backdrop" aria-hidden="true" onClick={()=>setOpen(false)}/>
  <div className="planner-fab-dock">
   <ul id={menuId} className="planner-fab-menu" aria-hidden={!open}>
    {actions.map((a,i)=><li key={a.key} style={{'--i':actions.length-1-i} as React.CSSProperties}>
     <button type="button" tabIndex={open?0:-1} disabled={a.disabled} className={a.primary?'is-primary':undefined} onClick={()=>{setOpen(false);a.onClick();}}>
      <span className="planner-fab-label">{a.label}</span><span className="planner-fab-icon" aria-hidden="true">{a.icon}</span>
     </button>
    </li>)}
   </ul>
   <button type="button" className="planner-fab-toggle" aria-expanded={open} aria-controls={menuId} aria-label={open?'빠른 메뉴 닫기':'빠른 메뉴 열기'} onClick={()=>setOpen(v=>!v)}>
    <span aria-hidden="true"/>
   </button>
  </div>
 </div>;
}
