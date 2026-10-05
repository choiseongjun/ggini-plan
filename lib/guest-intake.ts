// 비회원이 "먹었어요"를 눌러 본 기록: 이 기기에만 두고, 로그인하면 계정으로 옮긴다(importGuestIntake).
// 가입 전에 "먹었다 → 오늘 남은 양 → 다음 끼니"를 먼저 경험하게 하려는 임시 저장소다.
import type {IntakeData,IntakeLog} from './food-intake';
import type {MealSlot} from './meal-time';

const KEY='kkiniplan-guest-intake-v1';
const KEEP_DAYS=2;
type StoredLog=IntakeLog&{date:string};
export type GuestSnapshot={name:string;calories:number|null;protein:number|null;carbs:number|null;fat:number|null;sugar:number|null;sodium:number|null};

function read():StoredLog[]{
 try{const value=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(value)?value:[];}catch{return [];}
}
function write(logs:StoredLog[]){
 try{if(logs.length)localStorage.setItem(KEY,JSON.stringify(logs.slice(-40)));else localStorage.removeItem(KEY);}catch{/* private mode: the log lives only in this view */}
}
const daysAgo=(date:string,today:string)=>(Date.parse(today)-Date.parse(date))/86400000;

export function guestIntakeData(date:string):IntakeData{
 return {date,version:0,products:[],logs:read().filter(log=>log.date===date)};
}
export function hasGuestIntake(){return read().length>0;}

export function addGuestLog(input:{id:string;date:string;productId:string;portions:number;mealSlot?:MealSlot|null;snapshot:GuestSnapshot}){
 const logs=read().filter(log=>daysAgo(log.date,input.date)<=KEEP_DAYS&&log.id!==input.id);
 const scale=(value:number|null)=>value===null?null:Math.round(value*input.portions*10)/10;
 const now=new Date().toISOString();
 logs.push({id:input.id,date:input.date,productId:input.productId,name:input.snapshot.name,portions:input.portions,packs:0,mealSlot:input.mealSlot??null,
  calories:scale(input.snapshot.calories),protein:scale(input.snapshot.protein),carbs:scale(input.snapshot.carbs),fat:scale(input.snapshot.fat),sugar:scale(input.snapshot.sugar),sodium:scale(input.snapshot.sodium),
  createdAt:now,eatenAt:now});
 write(logs);
}
export function undoGuestLog(id:string){write(read().filter(log=>log.id!==id));}

// 로그인 직후: 기기에 남긴 기록을 계정의 먹은 기록으로 옮긴다. 같은 id로 보내므로 두 번 실행돼도 한 번만 저장된다.
export async function importGuestIntake(){
 const logs=read();
 if(!logs.length)return 0;
 let moved=0;
 const kept:StoredLog[]=[];
 for(const log of logs){
  try{
   const state=await fetch(`/api/food-intake?date=${log.date}`,{cache:'no-store'}).then(r=>r.ok?r.json():null);
   const r=await fetch('/api/food-intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'log',id:log.id,version:state?.version??0,productId:log.productId,portions:log.portions,extras:[],mealSlot:log.mealSlot??undefined,eatenAt:log.eatenAt})});
   if(r.ok)moved++;else kept.push(log);
  }catch{kept.push(log);}
 }
 write(kept);
 return moved;
}
