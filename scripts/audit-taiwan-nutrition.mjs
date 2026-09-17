import fs from 'node:fs';
const collected=JSON.parse(fs.readFileSync('data/taiwan-products.json','utf8')).products;
const original=JSON.parse(fs.readFileSync('data/taiwan-catalog.json','utf8')).products;
const reviewed=new Set(JSON.parse(fs.readFileSync('data/taiwan-nutrition-reviewed.json','utf8')).products.map(p=>p.id));
const products=collected.map(p=>{
 const file=`data/taiwan-evidence/nutrition/${p.id}.json`;
 const evidence=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 return {id:p.id,name:p.name,sourceUrl:p.productUrl,status:reviewed.has(p.id)?'verified_label':'unverified',pageCheckedAt:evidence?.checkedAt??null,evidenceImages:evidence?.labels?.length??0};
});
const verified=original.length+reviewed.size;
fs.writeFileSync('data/taiwan-nutrition-coverage.json',JSON.stringify({checkedAt:new Date().toISOString(),total:original.length+collected.length,verified,unverified:products.filter(p=>p.status==='unverified').length,note:'Unverified is not zero nutrition and does not establish that the manufacturer publishes no label. OCR, unreadable images, mismatched variants and conflicting values require additional source verification.',products},null,2));
console.log({total:original.length+collected.length,verified,unverified:collected.length-reviewed.size});
