import {parseStock} from './shopping-progress';

// One browser lock covers both guest edits and account imports across tabs.
export const withGuestStockLock=<T>(work:()=>Promise<T>)=>navigator.locks.request('kkiniplan-guest-stock',work);

export async function importGuestStock(userId:string){
 return withGuestStockLock(async()=>{
  for(const scope of ['products','ingredients'] as const){
   const key=`kkiniplan-progress-${scope}-guest`,raw=localStorage.getItem(key);
   if(!raw)continue;
   const data=JSON.parse(raw),stock=parseStock(data.stock);
   if(!stock)throw new Error('비회원 구매 목록을 읽지 못했어요.');
   if(data.importUserId&&data.importUserId!==userId)continue;
   if(!Object.values(stock).some(i=>i.ordered||i.owned))continue;
   const pending={...data,importId:data.importId??crypto.randomUUID(),importUserId:userId};
   localStorage.setItem(key,JSON.stringify(pending));
   const response=await fetch(`/api/shopping-progress?scope=${scope}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stock,importId:pending.importId,targetUserId:userId})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error??'비회원 목록을 합치지 못했어요. 다시 불러와 주세요.');
   localStorage.removeItem(key);
   window.dispatchEvent(new CustomEvent('shopping-progress-changed',{detail:{scope,source:'cart'}}));
  }
 });
}
