import { mkdir, readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';

// Collect first, inspect the manifest, then explicitly apply. Never overwrite a product.
const output = new URL('../data/catalog-raw-ingredients-2026-09-18.json', import.meta.url);
const target = 120;
const headers = { Origin: 'https://www.kurly.com', Referer: 'https://www.kurly.com/' };
const groups = [["두부",3,"raw","🧺"],["양배추",3,"raw","🧺"],["대파",3,"raw","🧺"],["감자",3,"raw","🧺"],["애호박",3,"raw","🧺"],["브로콜리",3,"raw","🧺"],["시금치",3,"raw","🧺"],["콩나물",3,"raw","🧺"],["숙주",3,"raw","🧺"],["청경채",3,"raw","🧺"],["오이",3,"raw","🧺"],["가지",3,"raw","🧺"],["파프리카",3,"raw","🧺"],["토마토",3,"raw","🧺"],["양파",3,"raw","🧺"],["당근",3,"raw","🧺"],["표고버섯",3,"raw","🧺"],["팽이버섯",3,"raw","🧺"],["새송이버섯",3,"raw","🧺"],["다진마늘",3,"raw","🧺"],["청양고추",3,"raw","🧺"],["깻잎",3,"raw","🧺"],["배추",3,"raw","🧺"],["무",3,"raw","🧺"],["돼지고기",3,"raw","🧺"],["앞다리",3,"raw","🧺"],["다짐육",3,"raw","🧺"],["닭다리살",3,"raw","🧺"],["닭안심",3,"raw","🧺"],["고등어",3,"raw","🧺"],["연어",3,"raw","🧺"],["오징어",3,"raw","🧺"],["바지락",3,"raw","🧺"],["새우살",3,"raw","🧺"],["미역",3,"raw","🧺"],["당면",3,"raw","🧺"],["소면",3,"raw","🧺"],["간장",3,"raw","🧺"],["된장",3,"raw","🧺"],["고추장",3,"raw","🧺"]];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function request(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}
const imageUrl = value => typeof value === 'string' ? value : value?.image?.path ?? value?.path;
const normalizeName = name => name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
function relevant(name,keyword){
return name.includes(keyword)&&!/두부야채전|두부텐더|가지강정|한입쏙|꼬치|마들렌|펫푸드|DOG|트릿|구운|밀키트|키트|볶음밥|덮밥|도시락|튀김|돈까스|돈카츠|만두|핫도그|스프|수프|찌개|전골|무침|조림|볶음|장아찌|김치|절임|구이|훈제|양념육|완자|주스|즙|샐러드|샌드위치|스낵|과자|칩|강아지|고양이|반려|이유식|유아|용기|세제|세트|소스포함|소스 포함/.test(name);
}

async function product(candidate, keyword, cuisine, emoji) {
  const productUrl = `https://www.kurly.com/goods/${candidate.no}`;
  const html = await (await request(productUrl)).text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing product payload');
  const p = JSON.parse(match[1]).props.pageProps.product;
  await writeFile(new URL('../data/nutrition-review/raw-ingredients-'+candidate.no+'.json',import.meta.url),JSON.stringify(p,null,2));
  if (!p || String(p.no)!==String(candidate.no) || !relevant(p.name, keyword) || p.isSoldOut || !p.isPurchaseStatus || p.isMultiplePrice || p.dealProducts?.length!==1) return null;
  const offer = p.dealProducts[0];
  if (offer.isSoldOut || !offer.isPurchaseStatus || offer.minEa>1 || p.minEa>1 || /최소 구매/.test(p.salesUnit??'') || /옵션별/.test(p.volume??'')) return null;
  const price = offer.discountedPrice ?? offer.basePrice;
  if (!Number.isSafeInteger(price) || price<=0 || !p.volume || !p.mainImageUrl?.startsWith('https://')) return null;
  const image = await request(p.mainImageUrl);
  const valid = image.headers.get('content-type')?.startsWith('image/');
  await image.body?.cancel();
  if (!valid) return null;
  // Standalone sauce/noodles are ingredients, never labeled as a complete meal.
  const category = 'ingredient';
  const storage = (p.storageTypes??[]).map(x=>({COLD:'냉장',FROZEN:'냉동',ROOM:'상온',ROOM_TEMPERATURE:'상온',AMBIENT_TEMPERATURE:'상온'}[x]??x)).join('/');
  const evidenceUrls = [...new Set([
    ...(p.productDetail?.legacyPiImages??[]),
    ...(p.productDetail?.contentDescription?.productImages??[]).flatMap(x=>x.content?.noticeImages??[]),
  ].map(imageUrl).filter(x=>typeof x==='string' && x.startsWith('https://')))].slice(0,20);
  return {
    id:`kurly-${p.no}`,name:p.name,detail:[p.volume,p.salesUnit,storage].filter(Boolean).join(' · ').slice(0,200),
    price,portions:p.salesUnit||'판매 구성 1개',quantity:1,unit:'개',category,emoji,color:cuisine==='western'?'peach':'mint',
    searchQuery:p.name,productUrl,productImageUrl:p.mainImageUrl,checkedAt:new Date().toISOString(),
    priceNote:'판매 구성 1개 기준 · 쿠폰 적용 전 표시가 · 배송비 별도',
    sourceKeyword:keyword,cuisine,sourceVolume:p.volume,sourceSalesUnit:p.salesUnit,
    allergyText:typeof p.allergy==='string'?p.allergy:null,
    nutritionNotice:(p.productNotice??[]).flatMap(n=>n.notices??[]).filter(n=>n.type==='PN06'),
    allergens:[],allergyInfo:{status:'unknown',statement:'',note:'신규 수집 상품: 원문 라벨 검수 전. 미등록은 알레르기 없음이 아닙니다.',sourceUrl:productUrl,evidenceUrls,crossContactNote:'제조시설·혼입 가능성은 원문 표시사항 확인 필요'},
  };
}
async function collect(existing) {
  let rows = [], skipped = [];
  if (process.argv.includes('--resume')) ({rows,skipped=[]}=JSON.parse(await readFile(output,'utf8')));
  rows=rows.filter(p=>relevant(p.name,p.sourceKeyword));
  const seen = new Set([...existing.map(p=>p.product_url),...rows.map(p=>p.productUrl)]);
  const names = new Set([...existing.map(p=>normalizeName(p.name)),...rows.map(p=>normalizeName(p.name))]);
  const needed = target;
  const save = async () => {
    for(let attempt=0;;attempt++) {
      try {await writeFile(output,JSON.stringify({target,checkedAt:new Date().toISOString(),existingCount:existing.length,rows,skipped},null,2));return;}
      catch(e) {if(attempt>=3)throw e;await new Promise(resolve=>setTimeout(resolve,250));}
    }
  };
  for (const [keyword,quota,cuisine,emoji] of groups) {
    let count = rows.filter(p=>p.sourceKeyword===keyword).length;
    for (let page=1;page<=2 && count<quota && rows.length<needed;page++) {
      const url=`https://api.kurly.com/search/v4/sites/market/normal-search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
      let result;
      try { result=await (await request(url)).json(); }
      catch(e) { skipped.push({url,error:e.message});break; }
      const candidates=(result.data?.listSections??[]).flatMap(s=>s.data?.items??[]).filter(p=>p.no&&p.name);
      if(!candidates.length)break;
      for(let i=0;i<candidates.length && count<quota && rows.length<needed;i+=4) {
        const batch=candidates.slice(i,i+4).filter(p=>!seen.has(`https://www.kurly.com/goods/${p.no}`)&&!names.has(normalizeName(p.name))&&relevant(p.name,keyword)&&!p.isSoldOut&&p.isPurchaseStatus&&!p.isMultiplePrice);
        const results=await Promise.all(batch.map(async p=>{
          seen.add(`https://www.kurly.com/goods/${p.no}`);
          try {return await product(p,keyword,cuisine,emoji);}catch(e){skipped.push({url:`https://www.kurly.com/goods/${p.no}`,error:e.message});return null;}
        }));
        for(const p of results) if(p && count<quota && rows.length<needed && !names.has(normalizeName(p.name))) { rows.push(p);names.add(normalizeName(p.name));count++; }
      }
      await save();
    }
    console.log(`${keyword}: ${count}/${quota}, collected ${rows.length}/${needed}`);
    if(rows.length>=needed)break;
  }
  await save();
}
async function apply(commit) {
  const manifest=JSON.parse(await readFile(output,'utf8'));
  if(!manifest.reviewedAt)throw new Error('Review manifest before import');
  const c=await pool.connect();const inserted=[],skipped=[];const ids=new Set();
  const fields=['calories_kcal','protein_g','carbohydrates_g','fat_g','sodium_mg'];
  try {
    await c.query('BEGIN');
    await c.query('LOCK TABLE catalog_items IN SHARE ROW EXCLUSIVE MODE');
    const before=(await c.query("SELECT market_code,COUNT(*)::int count FROM catalog_items GROUP BY market_code ORDER BY market_code")).rows;
    for(const p of manifest.rows) {
      if(!['vegetables','tofu','pork','beef','chicken_other','fish','noodles','sauce_oil'].includes(p.foodType)||ids.has(p.id)||!/^kurly-[0-9]+$/.test(p.id)||p.productUrl!=='https://www.kurly.com/goods/'+p.id.slice(6)||p.market!=='KR'||p.currency!=='KRW'||p.locale!=='ko-KR'||!Number.isSafeInteger(p.price)||p.price<=0||!p.productImageUrl?.startsWith('https://'))throw new Error('Invalid product '+p.id);
      ids.add(p.id);
      const n=p.nutrition;
      if(n&&(!n.basis||n.sourceUrl!==p.productUrl||!n.photoUrl?.startsWith('https://')||fields.some(f=>n[f]!==null&&(!Number.isFinite(n[f])||n[f]<0))))throw new Error('Invalid nutrition '+p.id);
      if((await c.query('SELECT id FROM catalog_items WHERE id=$1 OR product_url=$2 OR (market_code=$3 AND name=$4)',[p.id,p.productUrl,'KR',p.name])).rowCount){skipped.push(p.id);continue;}
      const columns=['id','name','detail','price','portions','quantity','unit','category','food_type','emoji','color','search_query','product_url','product_image_url','price_checked_at','price_note','in_weekly_cart','allergens','allergy_info','market_code','currency_code','source_locale',...fields,'nutrition_basis','nutrition_source_name','nutrition_source_url','nutrition_photo_url'];
      const values=[p.id,p.name,p.detail,p.price,p.portions,p.quantity,p.unit,p.category,p.foodType,p.emoji,p.color,p.searchQuery,p.productUrl,p.productImageUrl,p.checkedAt,p.priceNote,false,p.allergens,JSON.stringify(p.allergyInfo),'KR','KRW','ko-KR',...fields.map(f=>n?.[f]??null),n?.basis??null,n?.sourceName??null,n?.sourceUrl??null,n?.photoUrl??null];
      await c.query('INSERT INTO catalog_items ('+columns.join(',')+') VALUES ('+values.map((_,i)=>'$'+(i+1)).join(',')+')',values);
      inserted.push(p.id);
    }
    const after=(await c.query("SELECT market_code,COUNT(*)::int count FROM catalog_items GROUP BY market_code ORDER BY market_code")).rows;
    const audit={mode:commit?'apply':'dry-run',before,after,inserted,skipped,checkedAt:new Date().toISOString()};
    await mkdir('data/nutrition-review',{recursive:true});
    await writeFile('data/nutrition-review/raw-ingredients-import-'+Date.now()+'.json',JSON.stringify(audit,null,2));
    await c.query(commit?'COMMIT':'ROLLBACK');
    console.log(JSON.stringify({...audit,inserted:inserted.length,skipped:skipped.length},null,2));
  } catch(e) {await c.query('ROLLBACK');throw e;} finally {c.release();}
}
try {
  await mkdir(new URL('../data/nutrition-review/',import.meta.url),{recursive:true});
  if(process.argv.includes('--apply')||process.argv.includes('--check'))await apply(process.argv.includes('--apply'));
  else await collect((await pool.query("SELECT id,name,product_url FROM catalog_items WHERE market_code='KR'")).rows);
} finally {await pool.end();}
