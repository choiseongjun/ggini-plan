import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
const dir='data/nutrition-review';
const queue=[];
for(const file of await fs.readdir(dir))if(file.endsWith('.json')&&file!=='before.json'){
 const row=JSON.parse(await fs.readFile(`${dir}/${file}`,'utf8'));
 if(row.labels?.some(l=>!l.ocr))queue.push(row);
}
await Promise.all(Array.from({length:3},async()=>{
 const worker=await createWorker('kor+eng',1,{langPath:'assets/ocr'});
 await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
 try {while(queue.length){const row=queue.shift();
  for(const label of row.labels){ if(label.ocr)continue;
   const meta=await sharp(label.file).metadata();
   const data=await sharp(label.file).resize({width:Math.max(1600,meta.width)}).sharpen().toBuffer();
   const result=await worker.recognize(data);label.ocr=result.data.text;
  }
  await fs.writeFile(`${dir}/${row.id}.json`,JSON.stringify(row,null,2));console.log(row.id);
 }}finally{await worker.terminate();}
}));
