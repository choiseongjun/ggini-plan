import fs from 'node:fs/promises';
import {createWorker} from 'tesseract.js';
const sources=JSON.parse(await fs.readFile('data/shopping-source-research.json','utf8'));
const worker=await createWorker('kor+eng',1,{langPath:'assets/ocr'});
const previous=JSON.parse(await fs.readFile('data/shopping-label-research.json','utf8').catch(()=>'[]'));
const result=[];
try{
 for(const row of sources){
  const detail=row.product.productDetail;
  const urls=[...(detail?.legacyPiImages??[]),...(detail?.contentDescription?.productImages??[]).flatMap(x=>x.content?.noticeImages??[])];
  const labels=[];
  for(const url of [...new Set(urls.map(x=>typeof x==='string'?x:x.image.path))]){
   const existing=previous.find(p=>p.id===row.id)?.labels.find(l=>l.url===url&&l.text);if(existing){labels.push(existing);continue;}
   try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const {data}=await worker.recognize(Buffer.from(await response.arrayBuffer()));labels.push({url,text:data.text,confidence:data.confidence});
   }catch(e){labels.push({url,error:e.message});}
  }
  result.push({id:row.id,name:row.product.name,labels});
  await fs.writeFile('data/shopping-label-research.json',JSON.stringify(result,null,2));
  console.log(row.id,labels.length);
 }
}finally{await worker.terminate();}
