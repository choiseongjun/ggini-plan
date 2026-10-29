'use client';
import {LinkButton} from '../../components/ui';
import {trackAnalytics} from '../../../lib/analytics';
import {useState} from 'react';

// Keep the selected food and allowlisted source through recording and login.
export function KcalActions({code,kcal,amount,unit,protein,sugar}:{code:string;kcal:number|null;amount:number;unit:string;protein:number|null;sugar:number|null}){
 const [portions,setPortions]=useState(1);
 const track=()=>trackAnalytics('landing_cta_clicked',{source:'kcal'});
 return <div className="kcal-actions">
  <fieldset className="kcal-portions"><legend>기준량 {amount.toLocaleString('ko-KR')}{unit} 중 얼마나 먹었나요?</legend><div>{[[0.25,'¼배'],[0.5,'½배'],[1,'1배'],[2,'2배']].map(([value,label])=><label key={value}><input type="radio" name="kcal-portions" checked={portions===value} onChange={()=>{setPortions(Number(value));trackAnalytics('kcal_portion_selected',{source:'kcal'});}}/><span>{label}</span></label>)}</div></fieldset>
  <div className="kcal-selection" aria-live="polite"><span>내가 먹은 양 · {Math.round(amount*portions*10)/10}{unit}</span><strong>{kcal===null?'칼로리 미확인':`약 ${Math.round(kcal*portions).toLocaleString('ko-KR')} kcal`}</strong><span>단백질 {protein===null?'미확인':`${Math.round(protein*portions*10)/10}g`} · 당류 {sugar===null?'미확인':`${Math.round(sugar*portions*10)/10}g`}</span></div>
  <LinkButton variant="primary" size="lg" block href={`/record?log=${encodeURIComponent(code)}&portions=${portions}&from=kcal`} onClick={track}>오늘 먹은 것에 추가하기</LinkButton>
  <small>음식과 먹은 양을 그대로 가져가요. 저장할 때 로그인해 주세요.</small>
 </div>;
}
