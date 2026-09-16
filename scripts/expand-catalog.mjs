import { mkdir, readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';

// Public storefront data only. Existing administrator entries are never overwritten.
const output = new URL('../data/catalog-import-2026-09-16.json', import.meta.url);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const headers = { Origin: 'https://www.kurly.com', Referer: 'https://www.kurly.com/' };
const groups = [
  ['밀키트',25,/밀키트|KIT|키트/i], ['볶음밥',20,/볶음밥/],
  ['만두',10,/만두/], ['갈비탕',5,/갈비탕/], ['육개장',5,/육개장/],
  ['파스타',6,/파스타|스파게티|라자냐/], ['피자',5,/피자/],
  ['돈까스',5,/돈까스|돈가스|카츠/], ['떡볶이',5,/떡볶이/],
  ['도시락',4,/도시락/], ['샐러드',3,/샐러드/], ['카레',10,/카레|커리/],
];
async function json(url) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function detail(no) {
  const url = `https://www.kurly.com/goods/${no}`;
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No storefront product data');
  return JSON.parse(match[1]).props.pageProps.product;
}
async function collect(existing) {
  const rows = process.argv.includes('--resume') ? JSON.parse(await readFile(output,'utf8')).rows : [];
  const skipped = []; const seen = new Set([...existing.map(p=>p.product_url),...rows.map(p=>p.productUrl)]);
  const needed = Math.max(0,100-existing.length);
  for (const [keyword, quota, relevance] of groups) {
    let count=rows.filter(p=>p.sourceKeyword===keyword).length;
    for(let page=1;page<=4 && count<quota && rows.length<needed;page++) {
      const searchUrl=`https://api.kurly.com/search/v4/sites/market/normal-search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
      const result=await json(searchUrl);
      const candidates=(result.data?.listSections??[]).flatMap(s=>s.data?.items??[]).filter(p=>p.no&&p.name);
      if(!candidates.length)break;
      for(const candidate of candidates) {
        if(count>=quota||rows.length>=needed)break;
        const url=`https://www.kurly.com/goods/${candidate.no}`;
        if(seen.has(url)||!relevance.test(candidate.name)||candidate.isSoldOut||!candidate.isPurchaseStatus||candidate.isMultiplePrice)continue;
        seen.add(url);
        try {
          const p=await detail(candidate.no);
          if(!p||p.isSoldOut||!p.isPurchaseStatus||p.isMultiplePrice||p.dealProducts?.length!==1)continue;
          const offer=p.dealProducts[0];
          if(offer.isSoldOut||!offer.isPurchaseStatus||offer.minEa>1||p.minEa>1||/최소 구매/.test(p.salesUnit??'')||/옵션별/.test(p.volume??''))continue;
          const price=offer.discountedPrice??offer.basePrice;
          if(!Number.isSafeInteger(price)||price<=0||!p.volume||!p.mainImageUrl)continue;
          const image=await fetch(p.mainImageUrl,{headers,signal:AbortSignal.timeout(12000)});
          const valid=image.ok&&image.headers.get('content-type')?.startsWith('image/');
          await image.body?.cancel();if(!valid)continue;
          const category=keyword==='밀키트'||/밀키트|KIT|키트/i.test(p.name)?'meal_kit':p.storageTypes?.includes('FROZEN')?'frozen_meal':'ready_meal';
          const storage=(p.storageTypes??[]).map(x=>({COLD:'냉장',FROZEN:'냉동',ROOM:'상온',ROOM_TEMPERATURE:'상온',AMBIENT_TEMPERATURE:'상온'}[x]??x)).join('/');
          rows.push({id:`kurly-${p.no}`,name:p.name,detail:[p.volume,p.salesUnit,storage].filter(Boolean).join(' · ').slice(0,200),
            price,portions:p.salesUnit||'판매 구성 1개',quantity:1,unit:'개',category,emoji:category==='meal_kit'?'🍲':keyword==='볶음밥'?'🍚':'🥣',color:'mint',
            searchQuery:p.name,productUrl:url,productImageUrl:p.mainImageUrl,checkedAt:new Date().toISOString(),
            priceNote:'판매 구성 1개 기준 · 쿠폰 적용 전 표시가 · 배송비 별도',sourceKeyword:keyword,sourceVolume:p.volume,sourceSalesUnit:p.salesUnit,
            allergyText:p.allergy??null,nutritionNotice:(p.productNotice??[]).flatMap(n=>n.notices??[]).filter(n=>n.type==='PN06'),
            noticeImages:(p.productDetail?.contentDescription?.productImages??[]).flatMap(n=>n.content?.noticeImages??[]).map(n=>n.image?.path).filter(Boolean),
          });count++;
        }catch(e){skipped.push({url,error:e.message});}
      }
    }
    console.log(`${keyword}: ${count}, collected ${rows.length}/${needed}`);
  }
  await mkdir(new URL('../data/',import.meta.url),{recursive:true});
  await writeFile(output,JSON.stringify({checkedAt:new Date().toISOString(),rows,skipped},null,2));
  return rows;
}
try {
  const existing=(await pool.query('SELECT id,product_url FROM catalog_items')).rows;
  const rows=process.argv.includes('--apply')?JSON.parse(await readFile(output,'utf8')).rows:await collect(existing);
  if(process.argv.includes('--apply')) {
    const c=await pool.connect();let inserted=0;
    try{await c.query('BEGIN');
      for(const p of rows) {
        const r=await c.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,unit,category,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart)
          SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,FALSE
          WHERE NOT EXISTS(SELECT 1 FROM catalog_items WHERE product_url=$12)
          ON CONFLICT(id) DO NOTHING`,[p.id,p.name,p.detail,p.price,p.portions,p.quantity,p.unit,p.category,p.emoji,p.color,p.searchQuery,p.productUrl,p.productImageUrl,p.checkedAt,p.priceNote]);
        inserted+=r.rowCount;
      }
      await c.query('COMMIT');console.log(`Inserted ${inserted}; total ${(await c.query('SELECT COUNT(*) FROM catalog_items')).rows[0].count}`);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  }else console.log(`Review manifest: ${output.pathname}`);
}finally{await pool.end();}
