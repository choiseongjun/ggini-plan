import {NextRequest} from 'next/server';
import sharp from 'sharp';
import {sameOrigin} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {validBattleId} from '../../../../lib/dinner-battle';
import {battleIdentity,battleJson,readBattle} from '../../../../lib/dinner-battle-server';
import {validatedPhoto} from '../../../../lib/nutrition-photo';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,{params}:Context) {
 const {id}=await params;
 if(!validBattleId(id))return battleJson({error:'투표를 찾을 수 없어요.'},undefined,404);
 const who=battleIdentity(request);
 try{const battle=await readBattle(id,who.hash);return battle?battleJson(battle,who.token):battleJson({error:'삭제되었거나 없는 투표예요.'},undefined,404);}
 catch{return battleJson({error:'투표를 불러오지 못했어요. 다시 시도해 주세요.'},undefined,503);}
}
export async function POST(request:NextRequest,{params}:Context) {
 if(!sameOrigin(request)||request.headers.get('sec-fetch-site')==='cross-site')return battleJson({error:'요청을 확인해 주세요.'},undefined,403);
 const {id}=await params;
 if(!validBattleId(id))return battleJson({error:'투표를 찾을 수 없어요.'},undefined,404);
 const who=battleIdentity(request);
 let payload:Record<string,unknown>,photo:Buffer|null=null;
 try{
  if(request.headers.get('content-type')?.includes('multipart/form-data')){
   // Check ownership before decoding an uploaded image.
   const current=await readBattle(id,who.hash);
   if(!current?.mine)return battleJson({error:'만든 사람만 인증할 수 있어요.'},undefined,403);
   const form=await request.formData();
   if(form.get('choice')!=='0'&&form.get('choice')!=='1')return battleJson({error:'먹은 메뉴를 골라 주세요.'},undefined,400);
   payload={action:'finish',choice:Number(form.get('choice')),caption:form.get('caption')};
   const input=await validatedPhoto(form.get('photo'));
   if(!input)return battleJson({error:'인증 사진을 선택해 주세요.'},undefined,400);
   photo=await sharp(input.bytes,{limitInputPixels:25000000}).rotate().resize(1200,1200,{fit:'inside',withoutEnlargement:true}).jpeg({quality:78}).toBuffer();
   if(photo.length>1048576)throw Error('large');
  }else{payload=await request.json();}
  if(!payload||typeof payload!=='object')throw Error('invalid');
 }catch{return battleJson({error:'입력과 사진을 확인해 주세요. 사진은 JPG·PNG·WEBP, 8MB 이하로 골라 주세요.'},undefined,400);}
 let client;
 try{client=await getPool().connect();}catch{return battleJson({error:'저장하지 못했어요. 잠시 후 다시 시도해 주세요.'},undefined,503);}
 try{
  await client.query('BEGIN');
  const row=(await client.query('SELECT owner_hash,closed_at IS NOT NULL OR expires_at<=NOW() AS closed FROM dinner_battles WHERE id=$1 FOR UPDATE',[id])).rows[0];
  let error:string|undefined,status=400;
  if(!row){error='삭제되었거나 없는 투표예요.';status=404;}
  else if(payload.action==='vote'){
   if(row.closed){error='마감된 투표예요.';status=409;}
   else if(payload.choice!==0&&payload.choice!==1)error='메뉴를 하나 골라 주세요.';
   else await client.query('INSERT INTO dinner_battle_votes(battle_id,voter_hash,choice) VALUES($1,$2,$3) ON CONFLICT(battle_id,voter_hash) DO UPDATE SET choice=EXCLUDED.choice',[id,who.hash,payload.choice]);
  }else if(row.owner_hash!==who.hash){error='만든 사람만 변경할 수 있어요.';status=403;}
  else if(payload.action==='close')await client.query('UPDATE dinner_battles SET closed_at=COALESCE(closed_at,NOW()) WHERE id=$1',[id]);
  else if(payload.action==='finish'&&photo&&(payload.choice===0||payload.choice===1)&&typeof payload.caption==='string'&&payload.caption.trim().length<=200){
   await client.query('UPDATE dinner_battles SET closed_at=COALESCE(closed_at,NOW()),eaten_choice=$2,caption=$3,photo=$4 WHERE id=$1',[id,payload.choice,payload.caption.trim(),photo]);
  }else if(payload.action==='delete')await client.query('DELETE FROM dinner_battles WHERE id=$1',[id]);
  else error='입력을 확인해 주세요.';
  if(error){await client.query('ROLLBACK');return battleJson({error},undefined,status);}
  await client.query('COMMIT');
  return battleJson({ok:true},who.token);
 }catch{await client.query('ROLLBACK');return battleJson({error:'저장하지 못했어요. 다시 시도해 주세요.'},undefined,503);}finally{client.release();}
}
