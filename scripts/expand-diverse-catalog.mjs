import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

// Collect first, inspect the manifest, then explicitly apply. Never overwrite a product.
const target = Number(process.argv.find(x=>x.startsWith('--target='))?.split('=')[1] ?? 2000);
if(!Number.isSafeInteger(target)||target<1||target>10000)throw new Error('--target must be an integer between 1 and 10000');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required; run with --env-file=.env.local');
const output = new URL(`../data/catalog-kr-${target}.json`, import.meta.url);
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
// Complete meals first; raw ingredients are collected as a separate group.
groups.forEach(group=>{group[1]=Math.ceil(group[1]*3);});
groups.push(...[
 ['만두',90,'korean','🥟'],['갈비탕',40,'korean','🍲'],['육개장',35,'korean','🍲'],
 ['떡볶이',70,'korean','🍲'],['떡국',30,'korean','🍲'],['된장국',30,'korean','🍲'],
 ['미역국',40,'korean','🍲'],['설렁탕',30,'korean','🍲'],['삼계탕',30,'korean','🍗'],
 ['냉면',50,'korean','🍜'],['칼국수',50,'korean','🍜'],['수제비',30,'korean','🍜'],
 ['김밥',40,'korean','🍙'],['주먹밥',40,'korean','🍙'],['잡채',30,'korean','🥢'],
 ['제육',40,'korean','🥩'],['치킨',60,'korean','🍗'],['함박스테이크',30,'western','🥩'],
 ['닭가슴살',80,'ingredient','🍗'],['두부',55,'ingredient','🥬'],['계란',40,'ingredient','🥚'],
 ['현미',45,'ingredient','🍚'],['쌀',50,'ingredient','🍚'],['귀리',25,'ingredient','🌾'],
 ['소고기',70,'ingredient','🥩'],['돼지고기',65,'ingredient','🥩'],['닭고기',50,'ingredient','🍗'],
 ['연어',45,'ingredient','🐟'],['고등어',40,'ingredient','🐟'],['새우',50,'ingredient','🍤'],
 ['브로콜리',25,'ingredient','🥦'],['양배추',25,'ingredient','🥬'],['버섯',40,'ingredient','🍄'],
 ['감자',35,'ingredient','🥔'],['고구마',30,'ingredient','🍠'],['양파',25,'ingredient','🧅'],
]);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let nextRequest = 0;
async function request(url) {
  const start = Math.max(Date.now(), nextRequest);nextRequest = start + 200;
  await delay(Math.max(0,start-Date.now()));
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if(response.status===403||response.status===429)throw new Error(`STOP: HTTP ${response.status}; resume later`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}
const imageUrl = value => typeof value === 'string' ? value : value?.image?.path ?? value?.path;
const normalizeName = name => name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const sourceAllowed = (categories=[]) => !categories.some(name=>/주방용품|생활용품|식기|반려동물|뷰티|스킨케어|메이크업|과자|나쵸|감자칩|건강식품|영양제|유아동|주류|전통주|소주|위스키|와인|맥주/.test(name));
function relevant(name, keyword) {
  if(/젤리|캔디|사탕|초콜릿|완구|인형|장난감|간식볼|밥그릇|식기|수세미|키친타월|세제|샐러드볼|샐러드스피너|샐러드 스피너|디너볼|파스타볼|멀티볼|플레이트|커트러리|트레이|포크|나이프|글라스/.test(name))return false;
  if (/보온도시락|젓가락|죽통|찬통|트윙고/.test(name)) return false;
  const pattern = {스프:/스프|수프/,돈까스:/돈까스|돈가스|카츠/,파스타:/파스타|스파게티|링귀니|페투치네/,밀키트:/밀키트|키트|KIT/i};
  return (pattern[keyword] ?? new RegExp(keyword)).test(name) && !/강아지|고양이|반려|이유식|유아식|베이비|용기|접시|스프볼|수프볼|까사미아|이나바|챠오|주식캔|프링글스|꼬북칩|도리토스|오리온|팝콘|비스킷|쿠키|스낵|과자|KIDS|키즈|어린이|헬로키티|동물모양|스프레이|도시락통|도시락\s*김|런치박스|보냉백|수저/i.test(name);
}
function categoryFor(name, fallback, sourceCategories=[]) {
  if(sourceCategories.some(value=>['수입육','한우/육우','돼지고기','닭/오리고기','채소','쌀/잡곡','양념/오일','조미','면'].includes(value)))return 'ingredient';
  if(/스테이크/.test(name)&&! /함박|정식|밀키트|키트|빕스|마이셰프|훈제/.test(name))return 'ingredient';
  if(/소스|시즈닝|후추|드레싱/.test(name)&&! /포함|밀키트|키트|볶음밥|도시락|함박|샌드위치|돈까스|돈가스/.test(name))return 'ingredient';
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
  if (!p || String(p.no)!==String(candidate.no) || !relevant(p.name, keyword) || p.isOnlyAdult || p.isSoldOut || !p.isPurchaseStatus || p.isMultiplePrice || p.dealProducts?.length!==1) return null;
  if(!sourceAllowed(p.categoryNames))return null;
  const offer = p.dealProducts[0];
  if (offer.isSoldOut || !offer.isPurchaseStatus || offer.minEa>1 || p.minEa>1 || /최소 구매/.test(p.salesUnit??'') || /옵션별/.test(p.volume??'')) return null;
  const price = offer.discountedPrice ?? offer.basePrice;
  if (!Number.isSafeInteger(price) || price<=0 || !p.volume || !p.mainImageUrl?.startsWith('https://')) return null;
  const image = await request(p.mainImageUrl);
  const valid = image.headers.get('content-type')?.startsWith('image/');
  await image.body?.cancel();
  if (!valid) return null;
  // Standalone sauce/noodles are ingredients, never labeled as a complete meal.
  const rawIngredient=cuisine==='ingredient'&&!/도시락|볶음밥|김밥|샌드위치|샐러드|밀키트|키트|덮밥|국밥|찌개|피자|카레|스프|수프|죽|파스타/.test(p.name);
  const category = rawIngredient ? 'ingredient' : categoryFor(p.name, /밀키트|키트|KIT/i.test(p.name) ? 'meal_kit' : p.storageTypes?.includes('FROZEN') ? 'frozen_meal' : 'ready_meal',p.categoryNames);
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
    sourceKeyword:keyword,cuisine,sourceVolume:p.volume,sourceSalesUnit:p.salesUnit,sourceCategories:p.categoryNames??[],
    allergyText:typeof p.allergy==='string'?p.allergy:null,
    nutritionNotice:(p.productNotice??[]).flatMap(n=>n.notices??[]).filter(n=>n.type==='PN06'),
    allergens:[],allergyInfo:{status:'unknown',statement:'',note:'신규 수집 상품: 원문 라벨 검수 전. 미등록은 알레르기 없음이 아닙니다.',sourceUrl:productUrl,evidenceUrls,crossContactNote:'제조시설·혼입 가능성은 원문 표시사항 확인 필요'},
  };
}
async function collect(existing) {
  if(existing.length>=target){console.log(JSON.stringify({market:'KR',existing:existing.length,target,status:'already-complete'}));return;}
  let rows = [], skipped = [];
  if (process.argv.includes('--resume')) {
    try { ({rows,skipped=[]}=JSON.parse(await readFile(output,'utf8'))); }
    catch(e){if(e.code!=='ENOENT')throw e;}
  }
  const existingUrls = new Set(existing.map(p=>p.product_url));
  const existingNames = new Set(existing.map(p=>normalizeName(p.name)));
  rows=rows.filter(p=>!existingUrls.has(p.productUrl)&&!existingNames.has(normalizeName(p.name)));
  rows=rows.filter(p=>relevant(p.name,p.sourceKeyword)&&sourceAllowed(p.sourceCategories)).map(p=>({...p,category:categoryFor(p.name,p.category,p.sourceCategories)}));
  const seen = new Set([...existing.map(p=>p.product_url),...rows.map(p=>p.productUrl)]);
  const names = new Set([...existing.map(p=>normalizeName(p.name)),...rows.map(p=>normalizeName(p.name))]);
  const needed = Math.max(0,target-existing.length);
  const save = async () => {
    for(let attempt=0;;attempt++) {
      try {const temp=new URL(output.href+'.tmp');await writeFile(temp,JSON.stringify({market:'KR',target,checkedAt:new Date().toISOString(),existingCount:existing.length,rows,skipped},null,2));await rename(temp,output);return;}
      catch(e) {if(attempt>=3)throw e;await new Promise(resolve=>setTimeout(resolve,250));}
    }
  };
  for (const [keyword,quota,cuisine,emoji] of groups) {
    let count = rows.filter(p=>p.sourceKeyword===keyword).length;
    for (let page=1;page<=30 && count<quota && rows.length<needed;page++) {
      const url=`https://api.kurly.com/search/v4/sites/market/normal-search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
      let result;
      try { result=await (await request(url)).json(); }
      catch(e) { skipped.push({url,error:e.message});if(e.message.startsWith('STOP')){await save();throw e;}break; }
      const candidates=(result.data?.listSections??[]).flatMap(s=>s.data?.items??[]).filter(p=>p.no&&p.name);
      if(!candidates.length)break;
      for(let i=0;i<candidates.length && count<quota && rows.length<needed;i+=4) {
        const batch=candidates.slice(i,i+4).filter(p=>!seen.has(`https://www.kurly.com/goods/${p.no}`)&&!names.has(normalizeName(p.name))&&relevant(p.name,keyword)&&!p.isSoldOut&&p.isPurchaseStatus&&!p.isMultiplePrice);
        let stopped;
        const results=await Promise.all(batch.map(async p=>{
          seen.add(`https://www.kurly.com/goods/${p.no}`);
          try {return await product(p,keyword,cuisine,emoji);}catch(e){skipped.push({url:`https://www.kurly.com/goods/${p.no}`,error:e.message});if(e.message.startsWith('STOP'))stopped=e;return null;}
        }));
        for(const p of results) if(p && count<quota && rows.length<needed && !names.has(normalizeName(p.name))) { rows.push(p);names.add(normalizeName(p.name));count++; }
        if(stopped){await save();throw stopped;}
      }
      await save();
    }
    console.log(`${keyword}: ${count}/${quota}, collected ${rows.length}/${needed}`);
    if(rows.length>=needed)break;
  }
  await save();
  console.log(JSON.stringify({market:'KR',existing:existing.length,collected:rows.length,target,manifest:output.pathname}));
  if(rows.length<needed)process.exitCode=2;
}
async function apply() {
  const current=Number((await pool.query("SELECT COUNT(*) FROM catalog_items WHERE market_code='KR'")).rows[0].count);
  if(current>=target){console.log(JSON.stringify({inserted:0,total:current,target}));return;}
  const manifest=JSON.parse(await readFile(output,'utf8'));
  const {market}=manifest;
  const rows=manifest.rows.filter(p=>relevant(p.name,p.sourceKeyword)&&sourceAllowed(p.sourceCategories)).map(p=>({...p,category:categoryFor(p.name,p.category,p.sourceCategories)}));
  if(market!=='KR')throw new Error('Expected Korean catalog manifest');
  const c=await pool.connect();let inserted=0;
  try {
    await c.query('BEGIN');
    await c.query('LOCK TABLE catalog_items IN SHARE ROW EXCLUSIVE MODE');
    const existing=(await c.query("SELECT name,product_url FROM catalog_items WHERE market_code='KR'")).rows;
    const before=existing.length;
    const names=new Set(existing.map(p=>normalizeName(p.name)));
    const urls=new Set(existing.map(p=>p.product_url));
    for(const p of rows) {
      if(before+inserted>=target)break;
      if(names.has(normalizeName(p.name))||urls.has(p.productUrl))continue;
      if(!/^kurly-\d+$/.test(p.id)||p.productUrl!==`https://www.kurly.com/goods/${p.id.slice(6)}`||!Number.isSafeInteger(p.price)||p.price<=0||p.price>10000000||!p.productImageUrl?.startsWith('https://')||!Number.isFinite(Date.parse(p.checkedAt)))throw new Error('Invalid manifest row');
      const result=await c.query(`INSERT INTO catalog_items
        (id,name,detail,price,portions,quantity,unit,category,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info,market_code,currency_code,source_locale)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,FALSE,$16::text[],$17::jsonb,'KR','KRW','ko-KR'
        WHERE NOT EXISTS(SELECT 1 FROM catalog_items WHERE market_code='KR' AND (product_url=$12 OR name=$2))
        ON CONFLICT(id) DO NOTHING`,[p.id,p.name,p.detail,p.price,p.portions,p.quantity,p.unit,p.category,p.emoji,p.color,p.searchQuery,p.productUrl,p.productImageUrl,p.checkedAt,p.priceNote,p.allergens,JSON.stringify(p.allergyInfo)]);
      inserted+=result.rowCount;
      if(result.rowCount){names.add(normalizeName(p.name));urls.add(p.productUrl);}
    }
    await c.query('COMMIT');
    console.log(JSON.stringify({inserted,total:before+inserted,target}));
  } catch(e) {await c.query('ROLLBACK');throw e;} finally {c.release();}
}
try {
  await mkdir(new URL('../data/',import.meta.url),{recursive:true});
  if(process.argv.includes('--status')) {
    const counts=(await pool.query('SELECT market_code,COUNT(*)::int AS count FROM catalog_items GROUP BY market_code ORDER BY market_code')).rows;
    let saved=null;
    try {const manifest=JSON.parse(await readFile(output,'utf8'));saved={collected:manifest.rows.length,checkedAt:manifest.checkedAt};}catch(e){if(e.code!=='ENOENT')throw e;}
    console.log(JSON.stringify({counts,target,saved},null,2));
  }
  else if(process.argv.includes('--apply'))await apply();
  else await collect((await pool.query("SELECT id,name,product_url FROM catalog_items WHERE market_code='KR'")).rows);
} finally {await pool.end();}
