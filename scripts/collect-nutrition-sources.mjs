import fs from 'node:fs/promises';
import pg from 'pg';
const dir='data/nutrition-review';
await fs.mkdir(`${dir}/images`,{recursive:true});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
let rows;
try { rows=(await pool.query('SELECT id,name,detail,product_url,nutrition_source_name,nutrition_source_url,nutrition_basis,calories_kcal,protein_g,carbohydrates_g,fat_g,sodium_mg,updated_at FROM catalog_items ORDER BY id')).rows; }
finally { await pool.end(); }
// Keep the original snapshot for recovery when collecting newly added products.
try { await fs.writeFile(`${dir}/before.json`,JSON.stringify(rows,null,2),{flag:'wx'}); }
catch(error) { if(error.code!=='EEXIST')throw error; }
const cached=JSON.parse(await fs.readFile('data/shopping-source-research.json','utf8'));
const queue=[...rows];let done=0;
function imageUrl(value){if(typeof value==='string')return value;return value?.image?.path??value?.path??value?.url;}
await Promise.all(Array.from({length:4},async()=>{
 while(queue.length){const row=queue.shift();
  try{
   const path=`${dir}/${row.id}.json`;
   try { await fs.access(path);done++;continue; }catch{}
   let product=cached.find(x=>x.id===row.id)?.product;
   if(!product&&row.product_url.includes('kurly.com')){
    const response=await fetch(row.product_url,{signal:AbortSignal.timeout(20000)});
    const html=await response.text();const match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if(match)product=JSON.parse(match[1]).props.pageProps.product;
   }
   const detail=product?.productDetail;
   const images=[...new Set([...(detail?.legacyPiImages??[]),...(detail?.contentDescription?.productImages??[]).flatMap(x=>x.content?.noticeImages??[])].map(imageUrl).filter(x=>typeof x==='string'&&x.startsWith('https://')))];
   const notices=(product?.productNotice??[]).flatMap(x=>x.notices??[]).filter(x=>x.type==='PN06');
   const labels=[];
   for(const [index,url] of images.entries()){
    const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)continue;
    const file=`${dir}/images/${row.id}-${index}.jpg`;
    await fs.writeFile(file,Buffer.from(await response.arrayBuffer()));labels.push({url,file});
   }
   await fs.writeFile(path,JSON.stringify({...row,notices,labels},null,2));
   console.log(++done,row.id,labels.length);
  }catch(e){console.log('ERROR',row.id,e.message);}
 }
}));
