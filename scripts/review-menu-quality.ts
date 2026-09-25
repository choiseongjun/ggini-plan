import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {getPool} from '../lib/db';
type MenuInput={id:string;name:string;source:string;ingredients:{name:string;grams:number}[]};
const verify=process.argv.includes('--verify');
const model=process.env.OPENAI_MENU_REVIEW_MODEL||(verify?'gpt-4.1':'gpt-4.1-mini');
const dir='.cache/menu-review';fs.mkdirSync(dir,{recursive:true});
import {instructions, schema} from './menu-review-contract';
async function main(){
const pool=getPool();
try{
 const {rows}=await pool.query('SELECT food_code,target_name,source,ai_ingredients FROM recipe_optimizer_results ORDER BY food_code');
 const all:MenuInput[]=rows.map(r=>({id:r.food_code,name:r.target_name,source:r.source,ingredients:(r.ai_ingredients?.ingredients??[]).map((i:{name:string;grams:number})=>({name:i.name,grams:i.grams}))}));
 fs.writeFileSync(`${dir}/source.json`,JSON.stringify(all,null,2));
 const baseline=verify?JSON.parse(fs.readFileSync('data/menu-quality-review.json','utf8')):{};
 const source=all;
 const batches:MenuInput[][]=[];for(let i=0;i<source.length;i+=35)batches.push(source.slice(i,i+35));
 let cursor=0,done=0;const results: Record<string,unknown>={...baseline};
 await Promise.all(Array.from({length:1},async()=>{while(cursor<batches.length){const batch=batches[cursor++];const key=createHash('sha256').update(JSON.stringify({model,instructions,batch})).digest('hex');const path=`${dir}/${key}.json`;let items;
 if(fs.existsSync(path))items=JSON.parse(fs.readFileSync(path,'utf8')).items;
 else{for(let attempt=0;attempt<8;attempt++){try{
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model,store:false,instructions,input:JSON.stringify(batch),max_output_tokens:6500,text:{format:{type:'json_schema',name:'menu_review',strict:true,schema}}})});
 if(!r.ok){const failure=await r.json().catch(()=>null);throw Error(`API ${r.status}: ${failure?.error?.code??"unknown"}`);}const data=await r.json();const raw=data.output.filter((v:{type:string})=>v.type==='message').flatMap((v:{content:unknown[]})=>v.content).filter((v:{type:string})=>v.type==='output_text').map((v:{text:string})=>v.text).join('');
 items=JSON.parse(raw).items;
 if(!Array.isArray(items)||items.length!==batch.length||new Set(items.map(v=>v.id)).size!==batch.length||items.some(v=>!batch.some(b=>b.id===v.id)||!['keep','rename','hold'].includes(v.action)||typeof v.name!=='string'||typeof v.reason!=='string'))throw Error('Incomplete review');
 fs.writeFileSync(path,JSON.stringify({items,usage:data.usage,model},null,2));break;
 }catch(e){if(attempt===7)throw e;console.log(`Retry ${attempt+1}: ${e instanceof Error?e.message:e}`);await new Promise(resolve=>setTimeout(resolve,Math.min(30000,(attempt+1)*5000)));}}
 }
 for(const item of items){const row=batch.find(b=>b.id===item.id)!;results[item.id]={originalName:row.name,ingredients:row.ingredients,action:item.action==='rename'&&item.name===row.name?'keep':item.action,name:item.action==='rename'?item.name:row.name,reason:item.reason,model};}
 done+=batch.length;console.log(`Reviewed ${done}/${source.length}`);
 }}));
 fs.writeFileSync('data/menu-quality-review.json',JSON.stringify(Object.fromEntries(Object.entries(results).sort()),null,1)+'\n');
 const counts:Record<string,number>={};for(const row of Object.values(results) as {action:string}[])counts[row.action]=(counts[row.action]??0)+1;console.log(JSON.stringify(counts));
}finally{await pool.end();}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
