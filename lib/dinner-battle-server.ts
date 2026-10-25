import {createHash,randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {getPool} from './db';
import type {DinnerBattle} from './dinner-battle';
const cookie='ggini_battle_guest';
export function battleIdentity(request:NextRequest) {
 const old=request.cookies.get(cookie)?.value;
 const token=old&&/^[a-f0-9]{64}$/.test(old)?old:randomBytes(32).toString('hex');
 return {token,hash:createHash('sha256').update(token).digest('hex')};
}
export function battleJson(data:unknown,token?:string,status=200) {
 const response=NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
 if(token)response.cookies.set(cookie,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*365});
 return response;
}
export async function readBattle(id:string,hash:string):Promise<DinnerBattle|null> {
 const result=await getPool().query(`SELECT id,menu_a AS "menuA",menu_b AS "menuB",expires_at AS "expiresAt",
 (closed_at IS NOT NULL OR expires_at<=NOW()) AS closed,owner_hash=$2 AS mine,
 eaten_choice AS "eatenChoice",caption,photo IS NOT NULL AS "hasPhoto",
 ARRAY[(SELECT COUNT(*)::int FROM dinner_battle_votes WHERE battle_id=b.id AND choice=0),
 (SELECT COUNT(*)::int FROM dinner_battle_votes WHERE battle_id=b.id AND choice=1)] AS votes,
 (SELECT choice FROM dinner_battle_votes WHERE battle_id=b.id AND voter_hash=$2) AS voted
 FROM dinner_battles b WHERE id=$1`,[id,hash]);
 return result.rows[0]??null;
}
