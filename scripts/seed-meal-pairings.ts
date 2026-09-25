import {readFileSync} from 'node:fs';
import {getPool} from '../lib/db';
import {governmentOptimizedRecipeProducts} from '../lib/recipe-optimizer-plan';
import {proposePairings} from '../lib/meal-pairings';
import {savePairingProposals} from '../lib/meal-pairing-store';
import roles from '../data/dish-roles.json';
async function run(){
const pool=getPool();
try{
 await pool.query(readFileSync('db/meal-pairings.sql','utf8'));
 const [mains,sides]=await Promise.all([governmentOptimizedRecipeProducts(),governmentOptimizedRecipeProducts('side')]);
 const proposals=proposePairings(mains,sides);
 const inserted=await savePairingProposals(proposals,Object.entries(roles).map(([id,role])=>({menu_id:`recipe-opt-${id}`,role})));
 console.log(JSON.stringify({mains:mains.length,sides:sides.length,proposals:proposals.length,inserted,automaticallyApproved:0}));
}finally{await pool.end();}

}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
