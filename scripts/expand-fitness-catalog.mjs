import { mkdir, readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';

// Collect first, inspect the manifest, then explicitly apply. Never overwrite a product.
const output = new URL('../data/catalog-fitness-2026-09-18.json', import.meta.url);
const target = 650;
const headers = { Origin: 'https://www.kurly.com', Referer: 'https://www.kurly.com/' };
const groups = [
 ['닭가슴살',24,'fitness','🍗'],['닭안심',6,'fitness','🍗'],['도시락',12,'fitness','🍱'],
 ['샐러드',12,'fitness','🥗'],['그릭요거트',14,'fitness','🥣'],['단백질',12,'fitness','🥛'],
 ['프로틴',8,'fitness','🥛'],['오트밀',8,'fitness','🥣'],['곤약',8,'fitness','🍚'],
 ['현미밥',6,'fitness','🍚'],['두부면',5,'fitness','🍜'],['두유',10,'fitness','🥛'],
 ['계란',4,'fitness','🥚'],['통밀빵',3,'fitness','🍞'],
];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function request(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}
const imageUrl = value => typeof value === 'string' ? value : value?.image?.path ?? value?.path;
const normalizeName = name => name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
function relevant(name, keyword) {
 const patterns={도시락:/도시락/,단백질:/단백질|프로틴/,프로틴:/프로틴|단백질/,계란:/계란|달걀|구운란|훈제란/};
 return (patterns[keyword]??new RegExp(keyword)).test(name)&&!/듀먼|도시락\s*김|키즈|너겟|카츠|치킨까스|핫도그|장조림|꽃맛살|감자.*샐러드|버라이어티|스타터팩|기정떡|백설기|단백질칩|누네띠네|떡볶이|강아지|고양이|반려|이유식|유아|용기|도시락통|보냉|수저|젓가락|도마|주방|화장품|샴푸|마스크|세제|쉐이커|젤리|캔디|영양제|유산균|효소|콜라겐|크레아틴/i.test(name);
}
function categoryFor(name, fallback) {
  const ingredient = /파스타소스|파스타 소스|드레싱|파스타면|스파게티면|파우더|가루|분말|고형카레|시즈닝 스프|채소믹스|간편채소|용 채소|피자도우|버거번|번버거|용 소스|소스\s+\d|소스$/.test(name)
    || /불고기용|\[Kurly's\] 1\+\+ 한우 불고기|\[알치네로\] 유기농 통밀 파스타/.test(name)
    || /\[(바릴라|그라노로|펠리체티|산줄리아노|라 파브리카|델리치오|일상味소|미트엔조이|Ozen)\]/.test(name) && !/함박/.test(name)
    || /\[면사랑\] 스파게티|\[폰타나\] 이탈리아 스파게티|우리밀로만든쌀국수/.test(name);
  return ingredient && !/밀키트|키트|소스포함|소스 포함|w\.치즈크림소스/.test(name) ? 'ingredient' : fallback;
}
async function product(candidate, keyword, cuisine, emoji) {
  const productUrl = `https://www.kurly.com/goods/${candidate.no}`;
  const html = await (await request(productUrl)).text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing product payload');
  const p = JSON.parse(match[1]).props.pageProps.product;
  await writeFile(new URL('../data/nutrition-review/fitness-'+candidate.no+'.json',import.meta.url),JSON.stringify(p,null,2));
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
  const category = /그릭요거트|단백질|프로틴|두유/.test(p.name)&&!/도시락|볶음밥|만두/.test(p.name) ? 'other' : /닭가슴살|닭안심|계란|달걀|두부면|통밀빵/.test(p.name)&&!/볶음밥|도시락|샌드위치|김밥/.test(p.name) ? 'ingredient' : categoryFor(p.name, /밀키트|키트|KIT/i.test(p.name) ? 'meal_kit' : p.storageTypes?.includes('FROZEN') ? 'frozen_meal' : 'ready_meal');
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
  const needed = Math.max(0,target-existing.length);
  const save = async () => {
    for(let attempt=0;;attempt++) {
      try {await writeFile(output,JSON.stringify({target,checkedAt:new Date().toISOString(),existingCount:existing.length,rows,skipped},null,2));return;}
      catch(e) {if(attempt>=3)throw e;await new Promise(resolve=>setTimeout(resolve,250));}
    }
  };
  for (const [keyword,quota,cuisine,emoji] of groups) {
    let count = rows.filter(p=>p.sourceKeyword===keyword).length;
    for (let page=1;page<=8 && count<quota && rows.length<needed;page++) {
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
      if(ids.has(p.id)||!/^kurly-[0-9]+$/.test(p.id)||p.productUrl!=='https://www.kurly.com/goods/'+p.id.slice(6)||p.market!=='KR'||p.currency!=='KRW'||p.locale!=='ko-KR'||!Number.isSafeInteger(p.price)||p.price<=0||!p.productImageUrl?.startsWith('https://'))throw new Error('Invalid product '+p.id);
      ids.add(p.id);
      const n=p.nutrition;
      if(n&&(!n.basis||n.sourceUrl!==p.productUrl||!n.photoUrl?.startsWith('https://')||fields.some(f=>n[f]!==null&&(!Number.isFinite(n[f])||n[f]<0))))throw new Error('Invalid nutrition '+p.id);
      if((await c.query('SELECT id FROM catalog_items WHERE id=$1 OR product_url=$2 OR (market_code=$3 AND name=$4)',[p.id,p.productUrl,'KR',p.name])).rowCount){skipped.push(p.id);continue;}
      const columns=['id','name','detail','price','portions','quantity','unit','category','emoji','color','search_query','product_url','product_image_url','price_checked_at','price_note','in_weekly_cart','allergens','allergy_info','market_code','currency_code','source_locale',...fields,'nutrition_basis','nutrition_source_name','nutrition_source_url','nutrition_photo_url'];
      const values=[p.id,p.name,p.detail,p.price,p.portions,p.quantity,p.unit,p.category,p.emoji,p.color,p.searchQuery,p.productUrl,p.productImageUrl,p.checkedAt,p.priceNote,false,p.allergens,JSON.stringify(p.allergyInfo),'KR','KRW','ko-KR',...fields.map(f=>n?.[f]??null),n?.basis??null,n?.sourceName??null,n?.sourceUrl??null,n?.photoUrl??null];
      await c.query('INSERT INTO catalog_items ('+columns.join(',')+') VALUES ('+values.map((_,i)=>'$'+(i+1)).join(',')+')',values);
      inserted.push(p.id);
    }
    const after=(await c.query("SELECT market_code,COUNT(*)::int count FROM catalog_items GROUP BY market_code ORDER BY market_code")).rows;
    const audit={mode:commit?'apply':'dry-run',before,after,inserted,skipped,checkedAt:new Date().toISOString()};
    await mkdir('data/nutrition-review',{recursive:true});
    await writeFile('data/nutrition-review/fitness-import-'+Date.now()+'.json',JSON.stringify(audit,null,2));
    await c.query(commit?'COMMIT':'ROLLBACK');
    console.log(JSON.stringify({...audit,inserted:inserted.length,skipped:skipped.length},null,2));
  } catch(e) {await c.query('ROLLBACK');throw e;} finally {c.release();}
}
try {
  await mkdir(new URL('../data/nutrition-review/',import.meta.url),{recursive:true});
  if(process.argv.includes('--apply')||process.argv.includes('--check'))await apply(process.argv.includes('--apply'));
  else await collect((await pool.query("SELECT id,name,product_url FROM catalog_items WHERE market_code='KR'")).rows);
} finally {await pool.end();}
