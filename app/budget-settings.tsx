'use client';
import {useState} from 'react';
import type {DashboardData} from '../lib/dashboard';
const won=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
export function BudgetSettings({data,userId,onLogin,onRefresh}:{data:DashboardData|null;userId?:string;onLogin:()=>void;onRefresh:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function save(event:React.FormEvent<HTMLFormElement>,action:string){
  event.preventDefault();if(!userId){onLogin();return;}
  const amount=Number(new FormData(event.currentTarget).get('amount'));
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/dashboard',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,amount})});const d=await r.json();if(!r.ok)throw new Error(d.error);await onRefresh();setMessage(`${action==='monthlyBudget'?'이번 달':'이번 주'} 식비 예산을 저장했어요.`);}
  catch(e){setError(e instanceof Error?e.message:'예산을 저장하지 못했어요.');}finally{setBusy(false);}
 }
 const month=data?.today.slice(0,7),spent=data?.monthlyFoodSpent??0;
 return <section className="personal-meal-card" aria-labelledby="food-budget-title">
  <h2 id="food-budget-title">내 식비 예산 설정</h2>
  <p className="body-note">이번 달 전체 식비와 이번 주 식비 한도를 각각 정해요. 월이 바뀌면 새 예산을 입력해 주세요.</p>
  {!data?<p role="status">예산 정보를 불러오는 중이에요.</p>:<>
   {[{action:'monthlyBudget',label:`${month?.replace('-','년 ')}월 식비 예산`,amount:data.monthlyBudget},{action:'budget',label:'이번 주 식비 예산',amount:data.budget}].map(item=><form className="body-form" key={`${item.action}-${item.amount??'empty'}`} onSubmit={e=>save(e,item.action)}>
    <label htmlFor={item.action}>{item.label} (원)</label>
    <div className="input-wrap"><input id={item.action} name="amount" type="number" min="1" max="10000000" step="1" required inputMode="numeric" placeholder={item.action==='monthlyBudget'?'예: 300000':'예: 70000'} defaultValue={item.amount??''} disabled={busy}/><span>원</span></div>
    <p className="body-note">{item.amount?`저장한 예산 ${won(item.amount)}`:'아직 설정한 예산이 없어요.'}</p>
    <button type="submit" className="primary-button" disabled={busy}>{userId?(busy?'저장 중…':`${item.action==='monthlyBudget'?'월':'주간'} 예산 저장`):'로그인하고 예산 저장'}</button>
   </form>)}
   {data.monthlyBudget!=null&&<div className="meal-notice"><strong>이번 달 기록한 식비 {won(spent)}</strong><p>{spent<=data.monthlyBudget?`남은 예산 ${won(data.monthlyBudget-spent)}`:`예산보다 ${won(spent-data.monthlyBudget)} 초과했어요.`}</p><small>직접 입력한 식비 지출만 반영해요.</small></div>}
   {data.monthlyBudget!=null&&data.budget!=null&&data.budget>data.monthlyBudget&&<p className="body-note">주간 예산이 월 예산보다 높아요. 입력한 금액을 확인해 주세요.</p>}
  </>}
  {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p role="status" className="body-success">{message}</p>}
 </section>;
}
