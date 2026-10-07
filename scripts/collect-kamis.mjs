import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'data/regional-prices/raw');
const end=process.env.KAMIS_END_DATE||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
const start=process.env.KAMIS_START_DATE||new Date(Date.parse(end+'T00:00:00Z')-14*86400000).toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw Error('Invalid collection dates');
const key=process.env.KAMIS_SERVICE_KEY;
if(!key)throw Error('KAMIS_SERVICE_KEY is required');
const items=JSON.parse(await readFile(path.join(root,'data/regional-prices/api-items.json'),'utf8'));
await mkdir(output,{recursive:true});
const rows=[],counts=[];
let requests=0;
async function query(item,page){
 const params=new URLSearchParams({serviceKey:decodeURIComponent(key),pageNo:String(page),numOfRows:'1000',returnType:'JSON','cond[exmn_ymd::GTE]':start.replaceAll('-',''),'cond[exmn_ymd::LTE]':end.replaceAll('-',''),'cond[ctgry_cd::EQ]':item.category,'cond[item_cd::EQ]':item.item,'cond[se_cd::EQ]':'01'});
 for(let attempt=0;attempt<3;attempt++){
  try{
   requests++;const response=await fetch('https://apis.data.go.kr/B552845/perDay/price?'+params,{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error();const json=await response.json();const payload=json.response??json;
   if(String(payload.header?.resultCode)!=='0')throw Error();
   const body=payload.body;if(!Number.isInteger(body?.totalCount)||body.totalCount<0)throw Error();
   const list=body.items?.item??[];const records=Array.isArray(list)?list:[list];
   if(records.some(r=>r.item_cd!==item.item||r.ctgry_cd!==item.category||r.se_cd!=='01'||r.exmn_ymd<start.replaceAll('-','')||r.exmn_ymd>end.replaceAll('-','')))throw Error();
   return {total:body.totalCount,records};
  }catch{if(attempt===2)throw Error(`Collection failed for item ${item.item}, page ${page}; previous snapshot preserved`);await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
 }
}
async function collectItem(item){
 const first=await query(item,1);const collected=[...first.records];
 const pages=Math.ceil(first.total/1000);if(pages>100)throw Error('Unexpected page count');
 for(let page=2;page<=pages;page++){const part=await query(item,page);if(part.total!==first.total)throw Error('Source changed during pagination; retry collection');collected.push(...part.records);}
 if(collected.length!==first.total)throw Error('Incomplete pagination; previous snapshot preserved');
 rows.push(...collected);counts.push({...item,rows:collected.length});
 if(counts.length%10===0)console.log(`Collected ${counts.length}/${items.length} items, ${rows.length} rows`);
}
for(let i=0;i<items.length;i+=3)await Promise.all(items.slice(i,i+3).map(collectItem));
if(!rows.length)throw Error('Empty collection; previous snapshot preserved');
const snapshot={source:'https://www.data.go.kr/data/15156057/openapi.do',collectedAt:new Date().toISOString(),start,end,requests,counts,rows};
await writeFile(path.join(output,'kamis-api.json.tmp'),JSON.stringify(snapshot));
await rename(path.join(output,'kamis-api.json.tmp'),path.join(output,'kamis-api.json'));
console.log(JSON.stringify({start,end,requests,items:items.length,rows:rows.length}));
