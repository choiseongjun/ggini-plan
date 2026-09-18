import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {getPool} from './db';
import {parseKurlyProduct,robotsAllows} from './food-deal-parser';

const origin='https://www.kurly.com';
const source='kurly-public';
export class CollectionBusy extends Error {}
async function read(path:string){
 if(!/^\/(robots\.txt|sitemap\/(index-sitemap|goods-\d+)\.xml|goods\/\d+)$/.test(path))throw new Error('허용되지 않은 수집 경로');
 const r=await fetch(origin+path,{redirect:'error',cache:'no-store',headers:{'User-Agent':'GginiPlan-Deals/1.0 (+https://gginiplan.kr/deals)'},signal:AbortSignal.timeout(10000)});
 if(r.status===404)return null;
 if(!r.ok)throw new Error(`판매처 HTTP ${r.status}`);
 const reader=r.body?.getReader();if(!reader)throw new Error('빈 판매처 응답');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5000000)throw new Error('판매처 응답 크기 초과');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function collectionStatus(){
 const p=getPool();
 const [settings,runs,total]=await Promise.all([p.query('SELECT enabled FROM food_deal_collection_settings WHERE id=true'),p.query('SELECT * FROM food_deal_collection_runs ORDER BY started_at DESC LIMIT 8'),p.query('SELECT count(*)::integer AS count FROM food_deal_candidates')]);
 return {enabled:settings.rows[0]?.enabled??false,runs:runs.rows.map(r=>r.status==='running'&&Date.now()-Date.parse(r.heartbeat_at)>600000?{...r,status:'failed',message:'응답이 중단되었습니다. 다시 수집할 수 있어요.'}:r),candidates:total.rows[0].count,source:'컬리 공개 상품 페이지',schedule:'매일 오전 9시 이후 (한국 시간, 실행이 지연될 수 있어요)'};
}
export async function collectFoodDeals(trigger:'admin'|'daily',limit=60,timeBudgetMs=45000){
 const pool=getPool(),id=randomUUID(),started=Date.now();
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(72638102)');
  if(trigger==='daily'&&!(await client.query('SELECT enabled FROM food_deal_collection_settings WHERE id=true')).rows[0]?.enabled){await client.query('COMMIT');return {disabled:true};}
  await client.query("UPDATE food_deal_collection_runs SET status='failed',finished_at=now(),message='작업 응답이 중단되었습니다. 다시 수집할 수 있어요.' WHERE status='running' AND heartbeat_at<now()-interval '10 minutes'");
  if((await client.query("SELECT id FROM food_deal_collection_runs WHERE status='running' OR started_at>now()-interval '2 minutes' LIMIT 1")).rowCount)throw new CollectionBusy('이미 수집 중이거나 방금 완료했어요. 2분 뒤 다시 실행해 주세요.');
  await client.query('INSERT INTO food_deal_collection_runs(id,trigger) VALUES($1,$2)',[id,trigger]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 let scanned=0,published=0,ended=0,skipped=0,errors=0,lastError='',consecutiveErrors=0;
 const progress=()=>pool.query('UPDATE food_deal_collection_runs SET scanned=$2,published=$3,ended=$4,skipped=$5,errors=$6,heartbeat_at=now() WHERE id=$1',[id,scanned,published,ended,skipped,errors]);
 try{
  const robots=await read('/robots.txt');
  if(!robots||!robotsAllows(robots,'/goods/1001866269')||!robotsAllows(robots,'/sitemap/index-sitemap.xml'))throw new Error('판매처 수집 정책을 확인할 수 없거나 수집이 제한됐어요.');
  await pool.query(`INSERT INTO food_deal_candidates(url) SELECT DISTINCT product_url FROM catalog_items WHERE market_code='KR' AND product_url ~ '^https://www[.]kurly[.]com/goods/[0-9]+$' ON CONFLICT DO NOTHING`);
  // Discover new URLs from the public sitemap; never call the retailer's disallowed API.
  try{
   const index=await read('/sitemap/index-sitemap.xml');
   const maps=[...(index??'').matchAll(/<loc>https:\/\/www\.kurly\.com(\/sitemap\/goods-\d+\.xml)<\/loc>/g)].map(m=>m[1]);
   if(maps.length){const {rows}=await pool.query('SELECT count(*)::integer AS n FROM food_deal_collection_runs');const path=maps[(rows[0].n-1)%maps.length];
    if(!robotsAllows(robots,path))throw new Error('사이트맵 수집 제한');
    const xml=await read(path);
    const urls=[...(xml??'').matchAll(/<loc>(https:\/\/www\.kurly\.com\/goods\/\d+)<\/loc>/g)].map(m=>m[1]);
    if(urls.length)await pool.query('INSERT INTO food_deal_candidates(url) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING',[urls]);
   }
  }catch{errors++;lastError='새 상품 탐색 실패. 기존 상품 수집은 계속했습니다.';}
  // Refresh known food first. Reserve slots for new sitemap products on every run.
  const {rows}=await pool.query(`WITH ranked AS (SELECT c.url, i.id AS product_id,row_number() OVER (PARTITION BY (i.id IS NOT NULL) ORDER BY c.last_checked_at NULLS FIRST,md5(c.url)) AS pos FROM food_deal_candidates c LEFT JOIN catalog_items i ON i.product_url=c.url AND i.market_code='KR') SELECT DISTINCT url,product_id,pos FROM ranked WHERE (product_id IS NOT NULL AND pos<=$1) OR (product_id IS NULL AND pos<=$2) ORDER BY pos,url`,[Math.ceil(limit*.9),Math.floor(limit*.1)]);
  for(const item of rows){
   if(scanned>=limit||Date.now()-started>timeBudgetMs-11000)break;
   const path=new URL(item.url).pathname;if(!robotsAllows(robots,path))throw new Error('상품 페이지 수집 정책이 변경됐어요.');
   await delay(350);scanned++;
   try{
    const html=await read(path),result=html===null?{kind:'ended' as const}:parseKurlyProduct(html,item.url);
    if(result.kind==='deal'){
     const d=result.deal;
     const saved=await pool.query(`INSERT INTO food_deals(id,title,food_type,source_name,source_url,product_url,price,shipping,pack,conditions,product_id,status,checked_at,original_price,discount_rate,collection_source,deal_category)
      VALUES($1,$2,$3,'컬리',$4,$4,$5,$6,$7,$8,$9,'live',now(),$10,$11,$12,$13)
      ON CONFLICT(source_url) DO UPDATE SET title=EXCLUDED.title,food_type=EXCLUDED.food_type,price=EXCLUDED.price,shipping=EXCLUDED.shipping,pack=EXCLUDED.pack,conditions=EXCLUDED.conditions,status='live',checked_at=now(),updated_at=now(),ends_at=NULL,original_price=EXCLUDED.original_price,discount_rate=EXCLUDED.discount_rate,deal_category=EXCLUDED.deal_category,product_id=COALESCE(food_deals.product_id,EXCLUDED.product_id)
      WHERE food_deals.collection_source=$12`,[randomUUID(),d.title,d.food_type,item.url,d.price,d.shipping,d.pack,d.conditions,item.product_id,d.original_price,d.discount_rate,source,d.deal_category]);
     if(saved.rowCount)published++;else skipped++;
    }else{
     const closed=await pool.query("UPDATE food_deals SET status='ended',checked_at=now(),updated_at=now() WHERE source_url=$1 AND collection_source=$2 AND status<>'ended'",[item.url,source]);
     ended+=closed.rowCount??0;skipped++;
    }
    await pool.query('UPDATE food_deal_candidates SET last_checked_at=now(),last_result=$2 WHERE url=$1',[item.url,result.kind]);consecutiveErrors=0;
   }catch(e){errors++;consecutiveErrors++;lastError=e instanceof Error?e.message:'상품 확인 실패';await pool.query("UPDATE food_deal_candidates SET last_checked_at=now(),last_result='error' WHERE url=$1",[item.url]);if(/HTTP (403|429)/.test(lastError)||consecutiveErrors>=5)throw new Error(lastError);}
   await progress();
  }
  await progress();
  await pool.query("UPDATE food_deal_collection_runs SET status=$2,finished_at=now(),message=$3 WHERE id=$1",[id,errors?'partial':'success',errors?lastError:'할인 상품을 자동 공개했어요. 다음 실행은 확인이 오래된 상품부터 이어집니다.']);
  return {id,scanned,published,ended,skipped,errors};
 }catch(e){await progress();const message=e instanceof Error?e.message:'수집 실패';await pool.query("UPDATE food_deal_collection_runs SET status='failed',finished_at=now(),message=$2 WHERE id=$1",[id,message]);throw new Error(message);}
}
