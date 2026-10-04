'use client';
import {useEffect,useRef,useState,type ComponentProps} from 'react';
import {createPortal} from 'react-dom';
import {SnackLog} from './snack-log';
import './food-search-modal.css';

export function FoodSearchModal({onClose,onLogged,initialFood=null}:{onClose:()=>void;onLogged:ComponentProps<typeof SnackLog>['onLogged'];initialFood?:ComponentProps<typeof SnackLog>['initialFood']}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const node=dialog.current;if(!node)return;
  const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overflow=document.body.style.overflow;
  node.showModal();document.body.style.overflow='hidden';
  node.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  return()=>{node.close();document.body.style.overflow=overflow;trigger?.focus({preventScroll:true});};
 },[]);
 if(typeof document==='undefined')return null;
 return createPortal(<dialog ref={dialog} className="food-search-modal" aria-label="무엇을 먹었어요? 음식 검색" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <SnackLog initialOpen initialFood={initialFood} onBusyChange={setBusy} onClose={onClose} onLogged={(...args)=>{onLogged(...args);onClose();}}/>
 </dialog>,document.body);
}
