import {createHmac} from 'node:crypto';
import {getPool} from './db';
import {inferFoodType} from './catalog-food-types';
import {matchesCollection} from './catalog-collector';
import type {CollectionCategory} from './catalog-sellers';

export function coupangConfigured() {
 return Boolean(process.env.COUPANG_ACCESS_KEY?.trim() && process.env.COUPANG_SECRET_KEY?.trim());
}

function coupangDatetime() {
 const d = new Date();
 const pad = (n: number) => String(n).padStart(2, '0');
 return `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function coupangAuthorization(method: string, pathAndQuery: string) {
 const accessKey = process.env.COUPANG_ACCESS_KEY?.trim();
 const secretKey = process.env.COUPANG_SECRET_KEY?.trim();
 if (!accessKey || !secretKey) throw new Error('쿠팡 파트너스 API 키가 설정되지 않았어요.');
 const datetime = coupangDatetime();
 const signature = createHmac('sha256', secretKey).update(datetime + method + pathAndQuery).digest('hex');
 return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

type CoupangProduct = {productId?: unknown; productName?: unknown; productPrice?: unknown; productImage?: unknown; productUrl?: unknown};

async function searchCoupangProducts(keyword: string, limit: number): Promise<CoupangProduct[]> {
 const path = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
 const query = new URLSearchParams({keyword, limit: String(limit)}).toString();
 const response = await fetch(`https://api-gateway.coupang.com${path}?${query}`, {
  method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(10000),
  headers: {Authorization: coupangAuthorization('GET', path + query), 'Content-Type': 'application/json;charset=UTF-8'},
 });
 if (!response.ok) throw new Error(`쿠팡 API 응답 오류 (${response.status})`);
 const data = await response.json();
 const list = data?.data?.productData;
 if (!Array.isArray(list)) throw new Error('쿠팡 API 응답 형식을 확인해 주세요.');
 return list;
}

export async function collectCoupang({keyword, category, count}: {keyword: string; category: CollectionCategory; count: number}) {
 const c = await getPool().connect(); let locked = false;
 try {
  locked = (await c.query('SELECT pg_try_advisory_lock(741982,6) AS locked')).rows[0].locked;
  if (!locked) throw new Error('다른 상품 수집이 진행 중이에요. 잠시 후 다시 실행해 주세요.');
  const list = await searchCoupangProducts(keyword, Math.min(100, Math.max(1, count)));
  const results: {name: string; status: string; price?: number; message?: string}[] = [];
  for (const item of list) {
   const fallbackName = item?.productName ? String(item.productName) : `coupang-${item?.productId ?? '?'}`;
   try {
    const id = Number(item?.productId);
    const name = String(item?.productName ?? '').trim();
    const price = Number(item?.productPrice);
    const image = String(item?.productImage ?? '');
    const url = String(item?.productUrl ?? '');
    if (!Number.isSafeInteger(id)) throw new Error('상품 식별자 확인 실패');
    if (!name || name.length > 120) throw new Error('상품명 확인 실패');
    if (!matchesCollection(name, category)) throw new Error('선택한 카테고리와 맞지 않아 건너뜀');
    if (!Number.isSafeInteger(price) || price <= 0 || price > 10000000) throw new Error('가격 확인 실패');
    if (!image.startsWith('https://')) throw new Error('이미지 확인 실패');
    if (!url.startsWith('https://')) throw new Error('구매 링크 확인 실패');
    const catalogId = `coupang-${id}`;
    const catalogCategory = category === 'ready' ? 'ready_meal' : 'ingredient';
    const foodType = inferFoodType(name);
    const old = (await c.query('SELECT id,market_code,currency_code FROM catalog_items WHERE id=$1 OR product_url=$2', [catalogId, url])).rows[0];
    if (old) {
     if (old.market_code !== 'KR' || old.currency_code !== 'KRW') throw new Error('기존 판매 구성과 달라 검토 필요');
     await c.query('UPDATE catalog_items SET price=$2,product_image_url=$3,price_checked_at=NOW(),updated_at=NOW() WHERE id=$1', [old.id, price, image]);
     results.push({name, status: 'updated', price});
    } else {
     await c.query(
      `INSERT INTO catalog_items(id,name,detail,price,portions,quantity,unit,category,food_type,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info,market_code,currency_code,source_locale)
       VALUES($1,$2,$3,$4,'판매 구성 1개',1,'개',$5,$6,'🧺','mint',$2,$7,$8,NOW(),'쿠팡 파트너스 표시가 · 실제 결제 금액과 다를 수 있어요',false,ARRAY[]::text[],$9::jsonb,'KR','KRW','ko-KR')`,
      [catalogId, name, '쿠팡 판매 페이지 참고 · 판매 구성이 다를 수 있어요', price, catalogCategory, foodType, url, image,
       JSON.stringify({status: 'unknown', statement: '', note: '원문 영양·알레르기 검수 전', sourceUrl: url, evidenceUrls: []})],
     );
     results.push({name, status: 'inserted', price});
    }
   } catch (e) {
    results.push({name: fallbackName, status: 'skipped', message: e instanceof Error ? e.message : '상품 확인 실패'});
   }
  }
  return {results, checkedAt: new Date().toISOString(), total: list.length};
 } finally { try { if (locked) await c.query('SELECT pg_advisory_unlock(741982,6)'); } finally { c.release(); } }
}
