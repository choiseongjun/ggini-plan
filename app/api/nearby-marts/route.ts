import {NextRequest} from 'next/server';
import {sameOrigin} from '../../../lib/auth';
import {martSearchUrls,parseMartSearch,parseMarts,storeKey} from '../../../lib/nearby-marts';
import {surveyedOffers} from '../../../lib/regional-prices-db';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// 동네 이름으로만 찾는다 — 기기 위치를 받지 않고, 입력한 동네도 저장·기록하지 않는다.
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return json({error:'요청을 확인해 주세요.'},403);
 let input;
 try{const raw=await request.text();if(raw.length>2000)throw new Error();input=parseMartSearch(JSON.parse(raw));}catch{input=null;}
 if(!input)return json({error:'동네 이름을 두 글자 이상 적어 주세요.'},400);
 const key=process.env.KAKAO_REST_API_KEY?.trim();
 if(!key)return json({error:'마트 찾기를 준비 중이에요. 잠시 후 다시 이용해 주세요.'},503);
 try{
  const searches=await Promise.allSettled(martSearchUrls(input.area).map(async url=>{
   const response=await fetch(url,{headers:{Authorization:`KakaoAK ${key}`},cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error();
   return parseMarts(await response.json(),input.area);
  }));
  if(searches.every(s=>s.status==='rejected'))throw new Error();
  const marts=[...new Map(searches.flatMap(s=>s.status==='fulfilled'?s.value:[]).map(m=>[m.id,m])).values()];
  // 조사 가격은 덤이다: 조회가 늦거나 실패해도 마트 목록은 그대로 보여 준다.
  const offers=await surveyedOffers(marts.map(m=>storeKey(m.name)),input.keywords).catch(()=>[]);
  const priced=marts.map(m=>{const key=storeKey(m.name);const seen=new Set<string>();return {...m,offers:offers.filter(o=>o.store===key&&!seen.has(o.product)&&seen.add(o.product)).slice(0,4).map(({product,price,date})=>({product,price,date}))};});
  // 조사 가격이 있는 매장을 먼저, 나머지는 검색 순서대로 다섯 곳까지.
  return json({marts:[...priced.filter(m=>m.offers.length),...priced.filter(m=>!m.offers.length)].slice(0,5)});
 }catch{return json({error:'마트 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}
}
