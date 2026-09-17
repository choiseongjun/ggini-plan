import fs from 'node:fs/promises';
const dir='data/nutrition-review';
const pending=JSON.parse(await fs.readFile(`${dir}/pending-current.json`));
const reviewed=JSON.parse(await fs.readFile(`${dir}/backfill-reviewed.json`));
const fields=['calories_kcal','protein_g','carbohydrates_g','fat_g','sodium_mg'];
const sums=new Set([144,181,187,197,204,219,220,221,273,286,337,370,376]);
const items=[];
for(const [index,grams,...values] of reviewed){
 const row=JSON.parse(await fs.readFile(`${dir}/${pending[index].id}.json`));
 const label=row.labels.at(-1);
 items.push({id:row.id,name:row.name,detail:row.detail,productUrl:row.product_url,
 basis:`${grams}${index===200?'ml':'g'}당${sums.has(index)?' (표시 구성품 합산)':''}`,
 ...Object.fromEntries(fields.map((k,i)=>[k,values[i]])),
 sourceName:'컬리 판매처 상품 포장 영양표 · 2026-09-17 직접 확인',sourceUrl:row.product_url,
 photoUrl:label.url.replaceAll('&amp;','&'),evidenceUrls:row.labels.map(l=>l.url.replaceAll('&amp;','&')),
 expectedNutrition:Object.fromEntries(fields.map(k=>[k,row[k]===null?null:Number(row[k])])),
 expectedSource:{nutrition_basis:row.nutrition_basis,nutrition_source_name:row.nutrition_source_name,nutrition_source_url:row.nutrition_source_url}});
}
await fs.writeFile('data/catalog-nutrition-backfill-2026-09-17.json',JSON.stringify({reviewedAt:'2026-09-17',policy:'포장 표시값 직접 대조. 추정값 미사용. 부분 확인은 null 유지. 합산 기준 별도 표기.',items},null,2));
console.log({reviewed:items.length,complete:items.filter(r=>fields.every(k=>r[k]!==null)).length});
