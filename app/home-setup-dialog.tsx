'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {RiceBuddy} from './rice-buddy';
export function HomeSetupDialog({open,onClose,meals,cooking,children}:{open:boolean;onClose:()=>void;meals:ReactNode;cooking:ReactNode;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 const [step,setStep]=useState(0);
 useEffect(()=>{if(open)ref.current?.showModal();else ref.current?.close();},[open]);
 function changeStep(next:number){setStep(next);requestAnimationFrame(()=>{heading.current?.focus();ref.current?.scrollTo({top:0});});}
 return <dialog ref={ref} className="home-setup-dialog conversational-setup" onCancel={onClose} aria-label="끼니와 식단 고르기"><header><span>끼니와 함께 · {step+1} / 2</span><button type="button" onClick={onClose} aria-label="설정 닫기">✕</button></header><div className="setup-progress" aria-hidden="true"><i/><i className={step===1?'active':''}/></div><div className="setup-question"><RiceBuddy/><div><small>끼니</small><h2 ref={heading} tabIndex={-1}>{step===0?'어떤 끼니를 챙길까요?':'요리는 어느 정도가 좋아요?'}</h2><p>{step===0?'챙기고 싶은 끼니를 모두 골라주세요.':'오늘 할 수 있는 만큼만 골라요.'}</p></div></div>{step===0?<>{meals}<button type="button" className="setup-next" onClick={()=>changeStep(1)}>다음 →</button></>:<>{cooking}{children}<button type="button" className="setup-back" onClick={()=>changeStep(0)}>← 끼니 다시 고르기</button></>}</dialog>;
}
