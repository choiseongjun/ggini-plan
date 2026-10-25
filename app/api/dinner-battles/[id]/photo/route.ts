import {getPool} from '../../../../../lib/db';
import {validBattleId} from '../../../../../lib/dinner-battle';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!validBattleId(id))return new Response(null,{status:404});
 try{
  const row=(await getPool().query('SELECT photo FROM dinner_battles WHERE id=$1',[id])).rows[0];
  if(!row?.photo)return new Response(null,{status:404});
  return new Response(new Uint8Array(row.photo),{headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
