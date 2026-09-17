import {readFile,writeFile} from 'node:fs/promises';
const headers={Origin:'https://www.kurly.com',Referer:'https://www.kurly.com/'};
const targets=[['rice',1000144509],['onion',5067935],['carrot',5063380],['mushroom',5031390],['sesameOil',1002206637],['oil',1002206715],['salt',1002051587],['pumpkin',1000157460],['riceFlour',1002108207],['sugar',1000929774],['shrimp',5056554],['chicken',1000459595],['milk',5044571],['cheese',1001573924],['beef',5103616],['egg',1000179412],['pasta',1001574263],['tomatoSauce',1001994989]];
const output=new URL('../data/recipe-ingredient-offers.json',import.meta.url);
if(process.argv.includes('--collect')){
 const rows=[];
 for(let i=0;i<targets.length;i+=3){await Promise.all(targets.slice(i,i+3).map(async([key,no])=>{
  const sourceUrl=`https://www.kurly.com/goods/${no}`;
  const response=await fetch(sourceUrl,{headers,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`${key}: HTTP ${response.status}`);
  const html=await response.text(),match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(!match)throw new Error(`${key}: missing product data`);
  const p=JSON.parse(match[1]).props.pageProps.product;
  if(String(p.no)!==String(no)||p.isSoldOut||!p.isPurchaseStatus||p.isMultiplePrice||p.dealProducts?.length!==1)throw new Error(`${key}: unavailable or ambiguous offer`);
  const offer=p.dealProducts[0],price=offer.discountedPrice??offer.basePrice;
  if(offer.isSoldOut||!offer.isPurchaseStatus||offer.minEa>1||p.minEa>1||!Number.isSafeInteger(price)||price<=0)throw new Error(`${key}: unsupported offer`);
  rows.push({key,productNo:no,name:p.name,volume:p.volume,salesUnit:p.salesUnit,price,sourceUrl,checkedAt:new Date().toISOString(),imageUrl:p.mainImageUrl,allergyText:p.allergy??null,notices:p.productNotice??[],storageTypes:p.storageTypes,description:p.shortDescription??null});
  console.log(JSON.stringify({key,name:p.name,volume:p.volume,salesUnit:p.salesUnit,price,allergy:p.allergy}));
 }));}
 rows.sort((a,b)=>targets.findIndex(t=>t[0]===a.key)-targets.findIndex(t=>t[0]===b.key));
 await writeFile(output,JSON.stringify({source:'Kurly public product pages',rows},null,2)+'\n');
}else{
 const data=JSON.parse(await readFile(output,'utf8'));
 console.log(data.rows.map(r=>({key:r.key,name:r.name,volume:r.volume,price:r.price})));
}
