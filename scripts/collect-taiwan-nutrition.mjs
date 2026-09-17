import fs from 'node:fs/promises';
import {createWorker,PSM} from 'tesseract.js';
import sharp from 'sharp';

// Public product pages only; cached evidence makes interrupted runs resumable.
const dir='data/taiwan-evidence/nutrition';
await fs.mkdir(dir,{recursive:true});
const {products}=JSON.parse(await fs.readFile('data/taiwan-products.json','utf8'));
const worker=await createWorker('chi_tra+eng');
await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO});
try{
 for(const [i,p] of products.entries()){
  const file=`${dir}/${p.id}.json`;
  let previous;try{previous=JSON.parse(await fs.readFile(file,'utf8'));if(previous.scanVersion===2)continue;}catch{}
  const response=await fetch(p.productUrl,{signal:AbortSignal.timeout(25000)});
  if([403,429].includes(response.status))throw new Error(`Source requested stop: ${response.status}`);
  if(!response.ok)continue;
  const html=await response.text();
  const info=html.split('<div class="commodity-consult open">')[1]?.split('<div class="spec-introduce">')[0]??'';
  const detailUrls=[...info.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
  const urls=[...new Set([...detailUrls,...new Set([...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')).filter(u=>u.includes(p.sellerId+'-')&&!u.includes('?')))])];
  const labels=previous?.labels??[];
  for(const source of urls.slice(0,8)){
   const url=new URL(source,p.productUrl).href;if(labels.some(l=>l.url===url))continue;
   const index=labels.length;
   try{
    const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)continue;
    const buffer=Buffer.from(await r.arrayBuffer());
    const image=`${dir}/${p.id}-${index}.jpg`;await fs.writeFile(image,buffer);
    const prepared=await sharp(buffer).resize({width:1600,withoutEnlargement:false}).flatten({background:'white'}).toBuffer();
    const result=await worker.recognize(prepared);
    labels.push({url,file:image,text:result.data.text,confidence:result.data.confidence});
   }catch(error){console.log('Image unavailable',p.id,index,error.message);}
  }
  const pack=html.match(/<div class="hot">([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]*>/g,' ').trim()??'';
  await fs.writeFile(file,JSON.stringify({id:p.id,name:p.name,sourceUrl:p.productUrl,checkedAt:new Date().toISOString(),scanVersion:2,pack,labels},null,2));
  console.log(`${i+1}/${products.length}`,p.id,labels.length);
  await new Promise(resolve=>setTimeout(resolve,500));
 }
}finally{await worker.terminate();}
