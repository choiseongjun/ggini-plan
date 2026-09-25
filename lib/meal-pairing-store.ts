import {getPool} from './db';
import {templates,type Pairing} from './meal-pairings';
export async function listPairings():Promise<Pairing[]>{
 try{return (await getPool().query('SELECT * FROM meal_pairing_relations ORDER BY anchor_id,score DESC,companion_id')).rows;}
 catch(error){if((error as {code?:string}).code==='42P01')return [];throw error;}
}
export async function savePairingProposals(rows:Pairing[],roles:{menu_id:string;role:string}[],actor='seed'){
 const client=await getPool().connect();
 try{
  await client.query('BEGIN');
  for(const t of templates)await client.query('INSERT INTO meal_composition_templates(id,name,slots,enabled) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[t.id,t.name,JSON.stringify(t.slots),t.enabled]);
  await client.query(`INSERT INTO meal_menu_roles(menu_id,role,source) SELECT menu_id,role,'existing-ai-classification' FROM jsonb_to_recordset($1::jsonb) AS x(menu_id text,role text) ON CONFLICT DO NOTHING`,[JSON.stringify(roles)]);
  const inserted=await client.query(`INSERT INTO meal_pairing_relations(anchor_id,companion_id,template_id,slot,relation_type,score,reason,score_details,source,created_by)
   SELECT anchor_id,companion_id,template_id,slot,relation_type,score,reason,score_details,source,$2 FROM jsonb_to_recordset($1::jsonb) AS x(anchor_id text,companion_id text,template_id text,slot text,relation_type text,score integer,reason text,score_details jsonb,source text) ON CONFLICT DO NOTHING`,[JSON.stringify(rows),actor]);
  await client.query('COMMIT');return inserted.rowCount??0;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
