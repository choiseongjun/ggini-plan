import fs from 'node:fs/promises';
const dir='data/nutrition-review';
const pending=JSON.parse(await fs.readFile(`${dir}/pending-current.json`));
const reviewed=JSON.parse(await fs.readFile(`${dir}/backfill-reviewed.json`));
const fields=['calories_kcal','protein_g','carbohydrates_g','fat_g','sodium_mg'];
const sums=new Set([7,37,67,93,95,113,124,144,171,172,173,181,187,197,199,204,205,219,220,221,262,273,286,298,299,337,365,370,373,375,376,387,389,390]);
const labelOverrides={19:0};
const manufacturers={
 81:{name:'S&B Foods 공식 제품 영양정보',url:'https://www.sbfoods-worldwide.com/ko/products/search/041.html'},
 394:{name:'S&B Foods 공식 제품 영양정보',url:'https://www.sbfoods-worldwide.com/ko/products/search/054.html'},
 349:{name:'Kühne 공식 제품 영양정보',url:'https://www.kuehne-international.com/products/sauces/made-for-meat-chip-burger-style'},
};
const notes={98:'단백질 1g 미만',199:'단백질 1g 미만인 소스 포함',205:'탄수화물·단백질 1g 미만인 구성품 포함',342:'단백질 1g 미만',375:'단백질 1g 미만인 소스 포함'};
const items=[];
notes[67]='지방 표기 단위와 기준치 비율 불일치로 지방 확인 필요';
notes[81]='탄수화물 1g 미만';
notes[349]='나트륨 미표시, 소금 2.2g 별도 표시';
for(const [index,grams,...values] of reviewed){
 const row=JSON.parse(await fs.readFile(`${dir}/${pending[index].id}.json`));
 // Preserve earlier reviewed partial records with unresolved label-unit errors.
 if([317,330].includes(index))continue;
 const label=labelOverrides[index]!==undefined?row.labels[labelOverrides[index]]:row.labels.at(-1);
 items.push({id:row.id,name:row.name,detail:row.detail,productUrl:row.product_url,
 basis:`${grams}${[200,349].includes(index)?'ml':'g'}당${sums.has(index)?' (표시 구성품 합산)':''}${notes[index]?` (${notes[index]})`:''}`,
 ...Object.fromEntries(fields.map((k,i)=>[k,values[i]])),
 sourceName:manufacturers[index]?.name ?? '컬리 판매처 상품 포장 영양표 · 2026-09-17 직접 확인',sourceUrl:manufacturers[index]?.url ?? row.product_url,
 photoUrl:label.url.replaceAll('&amp;','&'),evidenceUrls:row.labels.map(l=>l.url.replaceAll('&amp;','&')),
 expectedNutrition:Object.fromEntries(fields.map(k=>[k,row[k]===null?null:Number(row[k])])),
 expectedSource:{nutrition_basis:row.nutrition_basis,nutrition_source_name:row.nutrition_source_name,nutrition_source_url:row.nutrition_source_url}});
}
await fs.writeFile('data/catalog-nutrition-backfill-2026-09-17.json',JSON.stringify({reviewedAt:'2026-09-17',policy:'포장 표시값 직접 대조. 추정값 미사용. 부분 확인은 null 유지. 합산 기준 별도 표기.',items},null,2));
console.log({reviewed:items.length,complete:items.filter(r=>fields.every(k=>r[k]!==null)).length});
