import {NextRequest} from 'next/server';
import {sameOrigin} from '../../../lib/auth';
import {parseRestaurantSearch,parseRestaurants,restaurantSearchParams} from '../../../lib/nearby-restaurants';
import {restaurantKeywords,mergeRestaurantMatches,surroundingRestaurantsUrl,withSurroundingRestaurants} from '../../../lib/restaurant-discovery';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return json({error:'요청을 확인해 주세요.'},403);
 let input;
 try{const raw=await request.text();if(raw.length>1500)throw new Error();input=parseRestaurantSearch(JSON.parse(raw));}catch{return json({error:'검색할 메뉴와 동네를 확인해 주세요.'},400);}
 if(!input)return json({error:'검색할 메뉴와 동네 또는 위치를 확인해 주세요.'},400);
 const key=process.env.KAKAO_REST_API_KEY?.trim();
 if(!key)return json({error:'주변 식당 검색을 준비 중이에요. 잠시 후 다시 이용해 주세요.'},503);
 try{
  const keywords=restaurantKeywords(input.menu);
  const urls=[...keywords.map(keyword=>`https://dapi.kakao.com/v2/local/search/keyword.json?${restaurantSearchParams({...input,menu:keyword})}`),...[1,2,3].map(page=>surroundingRestaurantsUrl(input,page))];
  const searches=await Promise.allSettled(urls.map(async url=>{
   const response=await fetch(url,{headers:{Authorization:`KakaoAK ${key}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('식당 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
   return parseRestaurants(await response.json(),input.latitude!==undefined);
  }));
  if(searches.every(result=>result.status==='rejected'))return json({error:'식당 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},503);
  const groups=searches.slice(0,keywords.length).map((result,index)=>({keyword:keywords[index],places:result.status==='fulfilled'?result.value:[]}));
  const surrounding=searches.slice(keywords.length).flatMap(result=>result.status==='fulfilled'?result.value:[]);
  const places=withSurroundingRestaurants(surrounding,mergeRestaurantMatches(groups,input.latitude!==undefined),input.latitude!==undefined);
  return json({places,keywords,partial:searches.some(result=>result.status==='rejected'),mode:input.area?'area':'nearby'});
 }catch{return json({error:'식당 검색 연결이 지연되고 있어요. 다시 시도해 주세요.'},503);}
}
