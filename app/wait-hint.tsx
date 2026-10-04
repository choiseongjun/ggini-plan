'use client';
import {useEffect,useState} from 'react';

// AI 분석처럼 길게 기다리는 동안, 시간이 지날수록 안내를 바꿔 멈춘 것처럼 보이지 않게 한다.
export function WaitHint({className}:{className?:string}){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{const timer=window.setInterval(()=>setSeconds(value=>value+1),1000);return()=>window.clearInterval(timer);},[]);
 return <small className={className}>{seconds<12?'보통 10초 안팎 걸려요.':seconds<25?'조금 더 걸리고 있어요. 화면을 닫지 말아 주세요.':'사진이 복잡하면 더 걸릴 수 있어요. 거의 다 됐어요.'}</small>;
}
