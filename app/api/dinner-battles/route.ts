import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {sameOrigin} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {parseBattleMenus} from '../../../lib/dinner-battle';
import {battleIdentity,battleJson} from '../../../lib/dinner-battle-server';
export const runtime='nodejs';
export async function GET(request:NextRequest) {
 const who=battleIdentity(request);
 return battleJson({ready:true},who.token);
}
export async function POST(request:NextRequest) {
 if(!sameOrigin(request)||request.headers.get('sec-fetch-site')==='cross-site')return battleJson({error:'요청을 확인해 주세요.'},undefined,403);
 const who=battleIdentity(request);
 let menus:[string,string]|null;
 try{menus=parseBattleMenus(await request.json());}catch{return battleJson({error:'메뉴 두 개를 입력해 주세요.'},undefined,400);}
 if(!menus)return battleJson({error:'서로 다른 메뉴를 40자 이내로 입력해 주세요.'},undefined,400);
 let client;
 try{client=await getPool().connect();}catch{return battleJson({error:'투표를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'},undefined,503);}
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[who.hash]);
  const count=await client.query("SELECT COUNT(*)::int AS n FROM dinner_battles WHERE owner_hash=$1 AND created_at>NOW()-INTERVAL '24 hours'",[who.hash]);
  if(count.rows[0].n>=5){await client.query('ROLLBACK');return battleJson({error:'오늘은 다섯 개까지 만들 수 있어요. 내일 다시 만들어 주세요.'},who.token,429);}
  const id=randomUUID();
  await client.query('INSERT INTO dinner_battles(id,owner_hash,menu_a,menu_b) VALUES($1,$2,$3,$4)',[id,who.hash,...menus]);
  await client.query('COMMIT');
  return battleJson({id},who.token,201);
 }catch{await client.query('ROLLBACK');return battleJson({error:'투표를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'},undefined,503);}finally{client.release();}
}
