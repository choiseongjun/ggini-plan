import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const root='data/nutrition-review';const queue=[];
for(const f of await fs.readdir(root)){if(!f.endsWith('.json'))continue;const r=JSON.parse(await fs.readFile(root+'/'+f,'utf8'));if(!r.labels||r.calories_kcal!==null)continue;for(const [i,l] of r.labels.entries()){const clean=root+'/clean/'+l.file.split('/').pop().replace(/\.[^.]+$/,'.png');const output=root+'/clean/'+r.id+'-'+i+'.ocr.json';try{await fs.access(output);continue;}catch{}queue.push({id:r.id,i,clean,output});}}
let completed=0;
await Promise.all(Array.from({length:8},async()=>{const w=await createWorker('kor+eng',1,{langPath:'assets/ocr'});await w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});try{while(queue.length){const job=queue.shift();try{const meta=await sharp(job.clean).metadata();const data=await sharp(job.clean).resize({width:Math.max(meta.width,1400)}).toBuffer();const {data:result}=await w.recognize(data);await fs.writeFile(job.output,JSON.stringify({id:job.id,index:job.i,text:result.text,confidence:result.confidence}));if(++completed%20===0)console.log('clean OCR',completed,'remaining',queue.length);}catch(e){console.log('failed',job.id,e.message);}}}finally{await w.terminate();}}));
