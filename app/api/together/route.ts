import {randomUUID} from 'node:crypto';
import {modes,menus,avoidOptions,commonMeals,type Mode} from '../../../lib/together-meal';
type Room={mode:Mode;keys:[string,string];votes:[string[]|null,string[]|null];avoids:[string[],string[]];expires:number};
const g=globalThis as typeof globalThis&{togetherPreview?:Map<string,Room>};
const rooms=g.togetherPreview??=new Map<string,Room>();
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function read(id:string,key:string){const room=rooms.get(id);if(!room||room.expires<Date.now())return null;const index=room.keys.indexOf(key);return index<0?null:{room,index:index as 0|1};}
function snapshot(room:Room,index:0|1){return {mode:room.mode,role:index,submitted:room.votes[index]!==null,partnerDone:room.votes[1-index]!==null,done:room.votes.every(v=>v!==null),matches:room.votes.every(v=>v!==null)?commonMeals(room.mode,room.votes as [string[],string[]],room.avoids):[]};}
export async function GET(request:Request){
 if(process.env.NODE_ENV!=='development')return json({error:'로컬 미리보기 전용이에요.'},404);
 const p=new URL(request.url).searchParams,found=read(p.get('room')??'',p.get('key')??'');
 return found?json(snapshot(found.room,found.index)):json({error:'초대가 만료됐어요. 새로 시작해 주세요.'},404);
}
export async function POST(request:Request){
 if(process.env.NODE_ENV!=='development')return json({error:'로컬 미리보기 전용이에요.'},404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'요청을 확인해 주세요.'},403);
 try{
 const raw=await request.text();if(raw.length>3000)return json({error:'입력이 너무 길어요.'},400);
 const body=JSON.parse(raw);
 if(body.action==='create'){
  if(!Object.hasOwn(modes,body.mode))return json({error:'식사 방법을 골라 주세요.'},400);
  for(const [id,room] of rooms)if(room.expires<Date.now())rooms.delete(id);
  if(rooms.size>=100)return json({error:'미리보기 방이 가득 찼어요. 나중에 다시 시도해 주세요.'},429);
  const id=randomUUID(),room:Room={mode:body.mode,keys:[randomUUID(),randomUUID()],votes:[null,null],avoids:[[],[]],expires:Date.now()+3600000};rooms.set(id,room);
  return json({room:id,key:room.keys[0],guestKey:room.keys[1]});
 }
 const found=read(body.room,body.key);if(!found)return json({error:'초대가 만료됐어요. 새로 시작해 주세요.'},404);
 const {room,index}=found;
 if(body.action==='vote'){
  if(!Array.isArray(body.likes)||!body.likes.every((id:unknown)=>typeof id==='string'&&menus[room.mode].some(m=>m.id===id))||!Array.isArray(body.avoid)||!body.avoid.every((t:unknown)=>typeof t==='string'&&avoidOptions.includes(t)))return json({error:'선택한 메뉴를 확인해 주세요.'},400);
  room.votes[index]=[...new Set(body.likes)] as string[];room.avoids[index]=body.avoid;
 }else if(body.action==='reset'){
  if(index!==0)return json({error:'초대한 사람이 다시 시작할 수 있어요.'},403);
  room.votes=[null,null];room.avoids=[[],[]];
 }else return json({error:'요청을 확인해 주세요.'},400);
 return json(snapshot(room,index));
 }catch{return json({error:'요청을 처리하지 못했어요. 다시 시도해 주세요.'},400);}
}
