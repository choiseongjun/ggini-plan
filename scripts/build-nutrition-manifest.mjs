import fs from 'node:fs/promises';
const dir='data/nutrition-review';
const verified=JSON.parse(await fs.readFile(`${dir}/verified.json`,'utf8'));
const overrides=JSON.parse(await fs.readFile(`${dir}/overrides.json`,'utf8'));
const before=JSON.parse(await fs.readFile(`${dir}/before.json`,'utf8'));
for(const file of await fs.readdir(dir)){
 if(!file.endsWith('.json'))continue;
 const row=JSON.parse(await fs.readFile(`${dir}/${file}`,'utf8'));
 if(row.id&&!before.some(r=>r.id===row.id))before.push(row);
}
const fields=['calories_kcal','protein_g','carbohydrates_g','fat_g','sodium_mg'];
const items=[];
for(const [id,basis,...rest] of verified){
 const row=JSON.parse(await fs.readFile(`${dir}/${id}.json`,'utf8'));
 const override=overrides[id]??{};
 const label=row.labels[rest[5]??0];
 const values=Object.fromEntries(fields.map((key,i)=>[key,rest[i]]));
 items.push({id,name:row.name,detail:row.detail,productUrl:row.product_url,basis,...values,
  sourceName:override.sourceName??'컬리 판매처 상품 포장 영양표 · 2026-09-17 확인',
  sourceUrl:override.sourceUrl??row.product_url,
  photoUrl:override.noPhoto?null:label?.url?.replaceAll('&amp;','&')??null,
  evidenceUrls:row.labels.map(l=>l.url.replaceAll('&amp;','&')),
  expectedNutrition:Object.fromEntries(fields.map(key=>[key,row[key]===null?null:Number(row[key])])),
  expectedSource:{nutrition_basis:row.nutrition_basis,nutrition_source_name:row.nutrition_source_name,nutrition_source_url:row.nutrition_source_url}});
}
const unresolved=before.filter(r=>!verified.some(v=>v[0]===r.id)&&fields.some(k=>r[k]===null)).map(r=>({id:r.id,name:r.name,sourceUrl:r.product_url,reason:'판매처 표시 이미지 및 추가 검색에서 전체 상품의 영양표를 확인하지 못함. 임의 추정값 미입력.'}));
await fs.writeFile('data/catalog-nutrition-2026-09-17.json',JSON.stringify({reviewedAt:'2026-09-17',policy:'직접 검토한 표시값. 기준량 보존, 구성품 합산은 basis에 명시. 미표기·부등호·단위오류는 null 및 주석으로 보존. 달걀은 별도 명시한 일반 식품 참고값.',items,unresolved},null,2)+'\n');
console.log(JSON.stringify({verified:items.length,complete:items.filter(r=>fields.every(k=>r[k]!==null)).length,partial:items.filter(r=>fields.some(k=>r[k]===null)).map(r=>({id:r.id,basis:r.basis})),unresolved},null,2));
