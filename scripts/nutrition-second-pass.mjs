import fs from 'node:fs/promises';import sharp from 'sharp';
const d='data/nutrition-review';const pending=JSON.parse(await fs.readFile(d+'/pending-current.json'));const reviewed=JSON.parse(await fs.readFile(d+'/backfill-reviewed.json'));const todo=[];
for(let i=0;i<pending.length;i++){
 if(reviewed.some(r=>r[0]===i&&r.slice(2).every(v=>v!==null)))continue;
 const r=JSON.parse(await fs.readFile(d+'/'+pending[i].id+'.json'));for(let j=0;j<r.labels.length;j++){const l=r.labels[j];todo.push({index:i,label:j,...l});}
}
await fs.writeFile(d+'/second-pass.json',JSON.stringify(todo));
for(let n=0;n<todo.length;n+=6){const composites=[];for(let j=0;j<6&&n+j<todo.length;j++){const r=todo[n+j];const x=j%2*700,y=Math.floor(j/2)*900;const label=Buffer.from(`<svg width="700" height="40"><rect width="700" height="40" fill="white"/><text x="10" y="27" font-size="22">${r.index} label ${r.label}</text></svg>`);composites.push({input:label,left:x,top:y});const b=await sharp(r.file).resize({width:680,height:850,fit:'inside'}).png().toBuffer();composites.push({input:b,left:x,top:y+45});}await sharp({create:{width:1400,height:2700,channels:3,background:'white'}}).composite(composites).png().toFile(d+'/second-'+n+'.png');}
console.log('secondpass',todo.length);
