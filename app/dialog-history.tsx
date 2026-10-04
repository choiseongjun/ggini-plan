'use client';
import {useEffect} from 'react';

type Entry={dialog:HTMLDialogElement;id:string};

// 앱(WebView)의 스와이프 뒤로가기·안드로이드 뒤로 버튼이 페이지 대신 열린 창을 닫도록,
// 열리는 <dialog>마다 같은 주소의 기록을 하나 쌓는다. 뒤로가기가 오면 그 창의 기존 닫기(cancel) 처리를 그대로 부른다.
export function DialogHistory(){
 useEffect(()=>{
  const stack:Entry[]=[];
  let seq=0;
  const ours=(id:string)=>(history.state as {ggDialog?:string}|null)?.ggDialog===id;
  const push=(dialog:HTMLDialogElement)=>{
   const id=`d${Date.now()}-${seq++}`;
   // Next.js merges its own router state into native pushState calls.
   history.pushState({ggDialog:id},'',location.href);
   stack.push({dialog,id});
  };
  const sync=()=>{
   for(let i=stack.length-1;i>=0;i--){
    const entry=stack[i];
    if(entry.dialog.isConnected&&entry.dialog.open)continue;
    stack.splice(i,1);
    // Closed from the UI: drop our extra entry, unless the close also navigated somewhere else.
    const href=location.href;
    setTimeout(()=>{if(ours(entry.id)&&location.href===href)history.back();},0);
   }
   document.querySelectorAll('dialog[open]').forEach(node=>{
    const dialog=node as HTMLDialogElement;
    if(!dialog.matches(':modal')||stack.some(entry=>entry.dialog===dialog))return;
    push(dialog);
   });
  };
  const onPop=()=>{
   const top=stack[stack.length-1];
   if(!top||ours(top.id))return;
   stack.pop();
   top.dialog.dispatchEvent(new Event('cancel',{cancelable:true}));
   // A dialog that refuses to close (e.g. saving) keeps its history entry.
   setTimeout(()=>{if(top.dialog.isConnected&&top.dialog.open)push(top.dialog);},0);
  };
  // iOS WebView는 키보드가 올라와도 화면 높이를 줄이지 않는다. 열린 창을 보이는 영역 안으로 올린다.
  const viewport=window.visualViewport;
  const fitKeyboard=()=>{
   if(!viewport)return;
   const keyboard=Math.max(0,Math.round(window.innerHeight-viewport.height-viewport.offsetTop));
   document.querySelectorAll('dialog[open]').forEach(node=>{
    const dialog=node as HTMLDialogElement;
    if(keyboard<80){dialog.style.removeProperty('translate');dialog.style.removeProperty('max-height');return;}
    // Bottom sheets rise by the full keyboard height; centred dialogs re-centre in the visible area.
    if(!dialog.dataset.kbSheet)dialog.dataset.kbSheet=dialog.getBoundingClientRect().bottom>=window.innerHeight-4?'bottom':'center';
    dialog.style.translate=`0 -${dialog.dataset.kbSheet==='bottom'?keyboard:Math.round(keyboard/2)}px`;
    dialog.style.maxHeight=`${Math.round(viewport.height-16)}px`;
   });
  };
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  window.addEventListener('popstate',onPop);
  viewport?.addEventListener('resize',fitKeyboard);
  sync();
  return()=>{observer.disconnect();window.removeEventListener('popstate',onPop);viewport?.removeEventListener('resize',fitKeyboard);};
 },[]);
 return null;
}
