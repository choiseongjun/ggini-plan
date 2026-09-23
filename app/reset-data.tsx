'use client';
import {invalidateJson} from '../lib/client-cache';
import {useRef,useState} from 'react';
import {withGuestStockLock} from '../lib/guest-shopping-progress';
import './reset-data.css';

export function ResetData({userId}:{userId?:string}){
 const [open,setOpen]=useState(false),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 async function reset(){
  if(lock.current||confirmation!=='전체 초기화')return;
  lock.current=true;setBusy(true);setError('');
  try{
   await withGuestStockLock(async()=>{
    invalidateJson();if(userId){const r=await fetch('/api/reset-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,confirmation})});const data=await r.json();if(!r.ok)throw new Error(data.error);}
    for(const storage of [localStorage,sessionStorage])for(const owner of new Set([userId??'guest','guest'])){
     storage.removeItem(`kkiniplan-shopping-draft-v2-${owner}`);
     for(const scope of ['products','ingredients'])storage.removeItem(`kkiniplan-progress-${scope}-${owner}`);
    }
    localStorage.setItem('kkiniplan-data-reset',JSON.stringify({userId:userId??'guest',at:Date.now()}));
   });
   window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:'초기화하지 못했어요. 다시 시도해 주세요.');setBusy(false);lock.current=false;}
 }
 return <section className="reset-data" aria-label="전체 데이터 초기화"><h3>처음부터 다시 시작하기</h3><p>식단과 기록, 설정을 비우고 새로 시작할 수 있어요.</p>
  {!open?<button type="button" onClick={()=>setOpen(true)}>전체 초기화</button>:<div role="group" aria-label="전체 초기화 확인"><strong>{userId?'이 계정의':'이 브라우저의'} 기록을 모두 초기화할까요?</strong>
   <ul><li>추천·저장 식단, 달력 식단, 장바구니·주문·보유 수량</li><li>먹은 기록, 칼로리·단백질 기록, 구매금액·생활비·예산</li><li>신체 정보, 제외 재료 등 추천 설정, 내 식단 공유 링크</li></ul>
   <p>계정과 로그인, 커뮤니티 활동·제보는 유지돼요. 실제 판매처 주문은 취소되지 않아요. 이 브라우저의 비회원 장보기 기록도 비워요.</p>
   <p>삭제한 기록은 되돌릴 수 없어요. 아래에 <b>전체 초기화</b>를 입력해 주세요.</p>
   <label>확인 문구<input autoComplete="off" value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)}/></label>
   <div className="reset-data-actions"><button type="button" disabled={busy} onClick={()=>{setOpen(false);setConfirmation('');setError('');}}>취소</button><button type="button" disabled={busy||confirmation!=='전체 초기화'} onClick={()=>void reset()}>{busy?'초기화 중…':'확인, 전체 초기화'}</button></div>
  </div>}{error&&<p role="alert">{error}</p>}
 </section>;
}
