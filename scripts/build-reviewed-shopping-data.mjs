import fs from 'node:fs/promises';
// Manually transcribed from the linked package labels, after comparing the original images.
// id, basis grams, kcal, protein g, carbohydrate g, fat g, sodium mg.
const nutrition=[
 ['1001591196',210,395,9,60,13,1020],['1001401863',230,365,7,60,11,1150],
 ['1001502057',230,405,9,65,12,920],['1001316382',100,190,4,28,7,480],
 ['5031706',207,400,10,49,18,1010],['1002140529',235,450,9,67,16,1370],
 ['1001044520',200,390,12,63,11,660],['1001528218',355,950,36,105,43,1210],
 ['1002430753',300,385,12,68,7,680],['1002115423',100,190,4,25,8,320],
 ['1002066866',440,770,23,71,44,2460],['5040715',270,160,5,31,1.7,680],
 ['1000430679',270,165,4,29,3.6,570],['5036742',270,185,3,41,1.2,410],
 ['5141864',271.5,150,6,24,3.1,580],['5161538',100,331,12,22,22,526],
 ['1000956905',185,538,17,41,34,1043],['1000235782',283,480,14,83,10,1220],
 ['1000235786',345,535,12,99,10,740],['1000235784',298,500,15,87,10,910],
];
const sources=JSON.parse(await fs.readFile('data/shopping-source-research.json','utf8'));
const original=JSON.parse(await fs.readFile('data/catalog-import-2026-09-16.json','utf8')).rows;
const rows=sources.map(({id,checkedAt,product:p})=>{
 const old=original.find(x=>x.id===id),offer=p.dealProducts[0];
 const images=[...(p.productDetail?.legacyPiImages??[]),...(p.productDetail?.contentDescription?.productImages??[]).flatMap(x=>x.content?.noticeImages?.map(n=>n.image.path)??[])];
 const text=`${p.name} ${p.volume} ${p.salesUnit}`;
 const explicit=text.match(/(\d+)\s*인분/)??text.match(/(\d+)\s*개입/)??text.match(/\((\d+)봉\)/);
 const totalGrams=Number(p.volume.replaceAll(',','').match(/^(\d+(?:\.\d+)?)\s*g/i)?.[1])||null;
 const servings=old?(explicit?Number(explicit[1]):/도시락|파스타/.test(p.name)&&totalGrams&&totalGrams<=450?1:null):id==='kurly-1000956905'?3:1;
 const n=nutrition.find(x=>`kurly-${x[0]}`===id);
 return {id,name:p.name,detail:old?.detail??[p.volume,p.salesUnit,p.storageTypes?.includes('FROZEN')?'냉동':'냉장'].join(' · '),
  price:offer.discountedPrice??offer.basePrice,quantity:1,unit:'개',portions:p.salesUnit,category:old?.category??(p.storageTypes?.includes('FROZEN')?'frozen_meal':'ready_meal'),
  productUrl:`https://www.kurly.com/goods/${p.no}`,productImageUrl:p.mainImageUrl,checkedAt,
  available:!p.isSoldOut&&p.isPurchaseStatus&&!offer.isSoldOut&&offer.isPurchaseStatus&&p.dealProducts.length===1,
  allergyText:p.allergy?.trim()||null,servings,servingGrams:servings&&totalGrams?totalGrams/servings:null,
  servingNote:servings?(explicit||id==='kurly-1000956905'?`판매 구성 ${servings}인분/개입 기준`:'판매 1팩을 1회분으로 배정'):null,
  nutrition:n?{basis:`${n[1]}g당`,caloriesKcal:n[2],proteinG:n[3],carbohydratesG:n[4],fatG:n[5],sodiumMg:n[6],photoUrl:id==='kurly-5161538'?images.at(-1):id==='kurly-5031706'?images.find(url=>url.includes('de06d83d')):id==='kurly-1001044520'?images.find(url=>url.includes('c84f0b95')):images[0],review:'원본 제품 표시 이미지와 수치 대조 완료'}:null,
  nutritionStatus:n?'verified':'unverified',noticeImages:images,
 };
});
await fs.writeFile('data/shopping-verified-2026-09-17.json',JSON.stringify({checkedAt:new Date().toISOString(),rows},null,2));
console.log({reviewed:rows.length,newProducts:rows.filter(x=>!original.some(p=>p.id===x.id)).length,nutrition:rows.filter(x=>x.nutrition).length});
