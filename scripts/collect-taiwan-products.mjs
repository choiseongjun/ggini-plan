import fs from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const origin='https://online.uni-prosperity.com.tw';
const supplement=process.argv.includes('--protein-supplement');
const destination=supplement?'data/taiwan-protein-products.json':'data/taiwan-products.json';
const target=supplement?100:492; // Plus the eight separately reviewed Laurel meals.
const products=[];const rejected=[];const discovered=new Map();
const jsonLd=html=>[...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{try{return [JSON.parse(m[1])];}catch{return [];}});
async function get(url){
 await delay(400);
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(response.status===429||response.status===403)throw new Error(`STOP: ${response.status}`);
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 if(new URL(response.url).origin!==origin)throw new Error('Unexpected origin');
 return response.text();
}
function addLinks(html,category){for(const list of jsonLd(html).filter(x=>x['@type']==='ItemList'))for(const entry of list.itemListElement??[]){const url=entry.url;const id=url?.match(/\/(\d+)\.html$/)?.[1];if(id&&new URL(url).origin===origin&&!discovered.has(id))discovered.set(id,{url,category});}}
async function checkpoint(){await fs.writeFile(destination,JSON.stringify({market:'TW',currency:'TWD',locale:'zh-TW',seller:'萬家福線上購物',sellerKey:'uniprosperity',sellerUrl:origin,collectedAt:new Date().toISOString(),products,rejected},null,2)+'\n');}
const home=await get(origin+'/zh/生鮮冷凍');
const categories=[...new Set([...home.matchAll(/href="([^"?]+)"/g)].map(m=>m[1]))].filter(x=>{const p=decodeURIComponent(x);return /^\/zh\/(生鮮冷凍|米油沖泡)\//.test(p)&&!p.endsWith('.html')&&!/咖啡|茶包|冰品|預售|禮盒|奶粉|保健/.test(p);});
// Spread coverage across prepared food, vegetables, meat, seafood, and staples.
if(supplement){for(let i=categories.length-1;i>=0;i--)if(!/生鮮冷凍\/(肉品|海鮮水產)\//.test(decodeURIComponent(categories[i])))categories.splice(i,1);}
categories.sort((a,b)=>Number(!decodeURIComponent(a).includes('冷凍調理'))-Number(!decodeURIComponent(b).includes('冷凍調理')));
for(const path of categories){const label=decodeURIComponent(path).split('/').slice(2).join(' / ');try{addLinks(await get(origin+path),label);}catch(e){if(e.message.startsWith('STOP'))throw e;rejected.push({url:origin+path,reason:e.message});}if(discovered.size>=750)break;}
console.log(`Discovered ${discovered.size} unique product URLs from food categories`);
const entries=[...discovered];
if(supplement){const groupCounts=new Map();const ranked=entries.map(entry=>{const key=entry[1].category;const rank=groupCounts.get(key)??0;groupCounts.set(key,rank+1);return {entry,rank};}).sort((a,b)=>a.rank-b.rank);entries.splice(0,entries.length,...ranked.map(x=>x.entry));}
for(const [sellerId,{url,category:sourceCategory}] of entries){
 try{
  const html=await get(url);const data=jsonLd(html).find(x=>x['@type']==='Product');const offer=data?.offers;
  if(!data||!offer||Array.isArray(offer)||offer.priceCurrency!=='TWD'||!/^\d+(?:\.\d{1,2})?$/.test(String(offer.price)))throw new Error('No unambiguous TWD offer');
  const priceMinor=Math.round(Number(offer.price)*100);if(priceMinor<=0||priceMinor>10000000)throw new Error('Price outside supported range');
  const name=String(data.name).trim();if(!name||name.length>120)throw new Error('Invalid name');
  const crumbs=jsonLd(html).find(x=>x['@type']==='BreadcrumbList')?.itemListElement?.map(x=>x.name).filter(Boolean).slice(1)??[];
  const categoryPath=crumbs.length?crumbs:sourceCategory.split(' / ');
  if(/酒|啤酒|威士忌|寵物|清潔/.test(name)||/酒類|寵物/.test(categoryPath.join(' ')))throw new Error('Outside food scope');
  const imageUrl=Array.isArray(data.image)?data.image[0]:data.image;
  if(typeof imageUrl!=='string'||!imageUrl.startsWith('https://'))throw new Error('Missing product image');
  const category=/冷凍調理/.test(categoryPath.join(' '))?'frozen_meal':/熟食|烘焙|甜點小菜/.test(categoryPath.join(' '))?'ready_meal':'ingredient';
  const spec=html.match(/<div class="hot">([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/^.*?規格[：:]\s*/, '').trim();
  const nameWeight=name.match(/(\d+(?:\.\d+)?)\s*(kg|公斤|公克|g|克)(?:\/|／|$|\s|\()/i);
  // Weight metadata is only recorded when stated; the retail unit is always
  // one listed offer. Never infer servings or nutrition from product names.
  products.push({id:`tw-uniprosperity-${sellerId}`,sellerId,name,priceMinor,productUrl:offer.url??url,imageUrl,category,categoryPath,packLabel:spec?.slice(0,120)||(nameWeight?nameWeight[0].replace(/[\/／(\s]+$/,''):'規格請見賣場'),availability:/\/InStock$/.test(offer.availability)?'in_stock':/\/OutOfStock$/.test(offer.availability)?'out_of_stock':'unknown',checkedAt:new Date().toISOString(),sourceUrl:url});
 }catch(e){if(e.message.startsWith('STOP')){await checkpoint();throw e;}rejected.push({url,reason:e.message});}
 if(products.length%25===0){await checkpoint();console.log(`Collected ${products.length}/${target}; rejected ${rejected.length}`);}
 if(products.length>=target)break;
}
await checkpoint();console.log(`Finished: ${products.length} products`);
if(products.length<target)process.exitCode=2;
