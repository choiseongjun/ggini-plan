import { readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';

// Collect first, inspect the manifest, then explicitly apply. Never overwrite a product.
const output = new URL('../data/catalog-expansion-2026-09-17.json', import.meta.url);
const target = 500;
const headers = { Origin: 'https://www.kurly.com', Referer: 'https://www.kurly.com/' };
const groups = [
  ['파스타',45,'western','🍝'], ['피자',25,'western','🍕'], ['스테이크',20,'western','🥩'], ['리소토',15,'western','🍚'],
  ['리조또',15,'western','🍚'], ['라자냐',12,'western','🍝'], ['뇨끼',10,'western','🍝'],
  ['스프',20,'western','🥣'], ['샌드위치',15,'western','🥪'], ['버거',12,'western','🍔'],
  ['그라탕',8,'western','🧀'], ['샐러드',20,'western','🥗'], ['브리또',10,'mexican','🌯'],
  ['타코',6,'mexican','🌮'], ['카레',15,'asian','🍛'], ['쌀국수',12,'asian','🍜'],
  ['팟타이',8,'asian','🍜'], ['우동',15,'japanese','🍜'], ['라멘',12,'japanese','🍜'],
  ['덮밥',15,'asian','🍚'], ['돈까스',15,'japanese','🍱'], ['마라',10,'chinese','🍲'],
  ['짜장',10,'chinese','🍜'], ['짬뽕',10,'chinese','🍜'], ['탕수육',8,'chinese','🥢'],
  ['볶음밥',20,'korean','🍚'], ['도시락',15,'korean','🍱'], ['솥밥',10,'korean','🍚'],
  ['찌개',15,'korean','🍲'], ['국밥',12,'korean','🍲'], ['닭갈비',8,'korean','🍗'],
  ['불고기',12,'korean','🥩'], ['비빔밥',10,'korean','🍚'], ['밀키트',20,'mixed','🍲'],
  ['감바스',15,'western','🍤'], ['함박',15,'western','🥩'], ['커리',15,'asian','🍛'],
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
  if (/보온도시락|젓가락|죽통|찬통|트윙고/.test(name)) return false;
  const pattern = {스프:/스프|수프/,돈까스:/돈까스|돈가스|카츠/,파스타:/파스타|스파게티|링귀니|페투치네/,밀키트:/밀키트|키트|KIT/i};
  return (pattern[keyword] ?? new RegExp(keyword)).test(name) && !/강아지|고양이|반려|이유식|유아식|베이비|용기|접시|스프볼|수프볼|까사미아|이나바|챠오|주식캔|프링글스|꼬북칩|도리토스|오리온|팝콘|비스킷|쿠키|스낵|과자|KIDS|키즈|어린이|헬로키티|동물모양|스프레이|도시락통|도시락\s*김|런치박스|보냉백|수저/i.test(name);
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
  const category = categoryFor(p.name, /밀키트|키트|KIT/i.test(p.name) ? 'meal_kit' : p.storageTypes?.includes('FROZEN') ? 'frozen_meal' : 'ready_meal');
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
  rows=rows.filter(p=>relevant(p.name,p.sourceKeyword)).map(p=>({...p,category:categoryFor(p.name,p.category)}));
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
async function apply() {
  const {rows}=JSON.parse(await readFile(output,'utf8'));
  const c=await pool.connect();let inserted=0;
  try {
    await c.query('BEGIN');
    await c.query('LOCK TABLE catalog_items IN SHARE ROW EXCLUSIVE MODE');
    const before=Number((await c.query('SELECT COUNT(*) FROM catalog_items')).rows[0].count);
    for(const p of rows) {
      if(before+inserted>=target)break;
      if(!p.id.startsWith('kurly-')||p.productUrl!==`https://www.kurly.com/goods/${p.id.slice(6)}`||!Number.isSafeInteger(p.price)||p.price<=0)throw new Error('Invalid manifest row');
      const result=await c.query(`INSERT INTO catalog_items
        (id,name,detail,price,portions,quantity,unit,category,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,FALSE,$16::text[],$17::jsonb
        WHERE NOT EXISTS(SELECT 1 FROM catalog_items WHERE product_url=$12 OR name=$2)
        ON CONFLICT(id) DO NOTHING`,[p.id,p.name,p.detail,p.price,p.portions,p.quantity,p.unit,p.category,p.emoji,p.color,p.searchQuery,p.productUrl,p.productImageUrl,p.checkedAt,p.priceNote,p.allergens,JSON.stringify(p.allergyInfo)]);
      inserted+=result.rowCount;
    }
    await c.query('COMMIT');
    console.log(JSON.stringify({inserted,total:before+inserted,target}));
  } catch(e) {await c.query('ROLLBACK');throw e;} finally {c.release();}
}
try {
  if(process.argv.includes('--apply'))await apply();
  else await collect((await pool.query('SELECT id,name,product_url FROM catalog_items')).rows);
} finally {await pool.end();}
