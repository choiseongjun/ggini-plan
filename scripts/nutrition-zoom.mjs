import fs from 'node:fs/promises';import sharp from 'sharp';
const d='data/nutrition-review', p=JSON.parse(await fs.readFile(`${d}/pending-current.json`));
for(const i of process.argv.slice(2).map(Number)){const r=JSON.parse(await fs.readFile(`${d}/${p[i].id}.json`));for(let j=0;j<r.labels.length;j++){const l=r.labels[j],m=await sharp(l.file).metadata();await sharp(l.file).extract({left:0,top:Math.max(0,m.height-1300),width:m.width,height:Math.min(1300,m.height)}).resize({width:1500}).png().toFile(`${d}/zoom-${i}-${j}.png`);}}
