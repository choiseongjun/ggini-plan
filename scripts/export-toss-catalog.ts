import fs from 'node:fs';
import {planProducts} from '../lib/shopping-plan-catalog';
import {getPool} from '../lib/db';
async function main(){
 try{
  const products=await planProducts();
  if(!products.length)throw new Error('Empty catalog; keeping the previous export.');
  fs.mkdirSync('toss/public',{recursive:true});
  fs.writeFileSync('toss/public/catalog.json',JSON.stringify({schemaVersion:2,exportedAt:new Date().toISOString(),products}));
  console.log(`Exported ${products.length} public recipe candidates`);
 }finally{await getPool().end();}
}
void main().catch(error=>{console.error(error instanceof Error?error.message:'Catalog export failed');process.exitCode=1;});
