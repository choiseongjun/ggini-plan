// Explicitly selected everyday combinations; never mass-approve generated proposals.
// Dry run by default. Run with --apply to record approvals with an audit trail.
import selected from '../data/home-meal-pairings.json';
import {getPool} from '../lib/db';
import {governmentOptimizedRecipeProducts} from '../lib/recipe-optimizer-plan';
import {savePairingProposals} from '../lib/meal-pairing-store';
import {composePairing,type Pairing} from '../lib/meal-pairings';

async function run(){
 const pool=getPool();
 try{
  const [mains,sides]=await Promise.all([governmentOptimizedRecipeProducts(),governmentOptimizedRecipeProducts('side')]);
  const rows:Pairing[]=selected.map(row=>{
   const main=mains.find(p=>p.id===row.mainId&&p.name===row.mainName);
   const side=sides.find(p=>p.id===row.sideId&&p.name===row.sideName);
   if(!main?.recipe?.ingredients.some(i=>i.label.startsWith('함께 먹는 밥'))||!side?.recipe)throw new Error(`Unavailable combination: ${row.mainName} / ${row.sideName}`);
   const combo=composePairing(main,[side]);
   if(!Number.isFinite(combo.price)||combo.price<=0||![combo.recipe!.nutrition.calories,combo.recipe!.nutrition.protein].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0))throw new Error(`Missing price/nutrition: ${row.mainName}`);
   return {anchor_id:main.id,companion_id:side.id,template_id:'rice-meal',slot:'side',relation_type:'pairing',score:80,score_details:{role:60,vegetable:10,curated:10},reason:row.reason,source:'curated-home-v1',status:'suggested'};
  });
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({validated:rows.length,mains:new Set(rows.map(r=>r.anchor_id)).size,applied:false}));return;}
  await savePairingProposals(rows,[],'curated-home-v1');
  const client=await pool.connect();let approved=0;
  try{
   await client.query('BEGIN');
   for(const row of rows){
    const old=(await client.query("SELECT * FROM meal_pairing_relations WHERE anchor_id=$1 AND companion_id=$2 AND template_id='rice-meal' AND slot='side' AND relation_type='pairing' FOR UPDATE",[row.anchor_id,row.companion_id])).rows[0];
    // Preserve administrator decisions, including explicitly returned-to-review rows.
    if(!old||old.status!=='suggested'||old.reviewed_by)continue;
    const blocked=await client.query("SELECT 1 FROM meal_pairing_relations WHERE anchor_id=$1 AND companion_id=$2 AND relation_type='avoid_pairing' AND status='approved'",[row.anchor_id,row.companion_id]);
    if(blocked.rowCount)continue;
    const next=(await client.query("UPDATE meal_pairing_relations SET status='approved',source=$2,reason=$3,score=$4,score_details=$5,reviewed_by=$2,updated_at=now() WHERE id=$1 RETURNING *",[old.id,row.source,row.reason,row.score,JSON.stringify(row.score_details)])).rows[0];
    await client.query('INSERT INTO meal_pairing_audit(relation_id,actor,before_data,after_data) VALUES($1,$2,$3,$4)',[old.id,row.source,JSON.stringify(old),JSON.stringify(next)]);approved++;
   }
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  console.log(JSON.stringify({validated:rows.length,approved,skipped:rows.length-approved}));
 }finally{await pool.end();}
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
