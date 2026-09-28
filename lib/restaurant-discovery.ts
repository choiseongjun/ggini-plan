import {restaurantSearchParams,type NearbyRestaurant,type RestaurantSearch} from './nearby-restaurants';

export type RestaurantMatch=NearbyRestaurant&{match:'menu'|'similar'|'nearby';keyword:string};
export function surroundingRestaurantsUrl(input:RestaurantSearch,page=1){
 const params=restaurantSearchParams({...input,menu:'음식점'});
 params.set('page',String(page));
 if(input.latitude!==undefined){params.delete('query');return `https://dapi.kakao.com/v2/local/search/category.json?${params}`;}
 return `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`;
}
export function withSurroundingRestaurants(nearby:NearbyRestaurant[],matched:RestaurantMatch[],hasOrigin:boolean){
 const matches=new Map(matched.map(place=>[place.id,place]));
 const combined=new Map<string,RestaurantMatch>();
 for(const place of nearby)combined.set(place.id,matches.get(place.id)??{...place,match:'nearby',keyword:''});
 for(const place of matched)if(!combined.has(place.id))combined.set(place.id,place);
 const results=[...combined.values()];
 return hasOrigin?results.sort((a,b)=>(a.distance??Infinity)-(b.distance??Infinity)):results;
}
export function restaurantKeywords(menu:string){
 const main=menu.split(/\s*\+\s*/)[0].replace(/[_·]/g,' ').replace(/\([^)]*\)/g,'').trim();
 const rules:Array<[RegExp,string[]]>=[
  [/순두부/,['순두부','두부요리','찌개']],
  [/김치찌개/,['김치찌개','찌개','한식']],
  [/된장찌개|청국장/,['청국장','된장찌개','한식']],
  [/찌개|전골/,['찌개','전골','한식']],
  [/국밥|장국|뭇국|해장국|곰탕|설렁탕/,['국밥','곰탕','해장국']],
  [/불고기|제육|두루치기/,['불고기','제육볶음','백반']],
  [/비빔밥|덮밥|볶음밥/,['비빔밥','덮밥','한식']],
  [/파스타|스파게티|리조또/,['파스타','이탈리안']],
  [/샐러드|포케/,['샐러드','포케']],
  [/돈까스|돈가스|카츠/,['돈까스','일식']],
  [/국수|냉면|우동|칼국수/,['국수','면요리']],
  [/북어|황태|명태|동태|코다리|고등어|갈치|가자미|생선/,['생선구이','생선요리']],
  [/닭|치킨/,['닭요리','치킨']],
  [/피자/,['피자','이탈리안']],
  [/초밥|스시|회덮밥/,['초밥','일식']],
  [/햄버거|버거/,['햄버거','수제버거']],
  [/샌드위치|토스트/,['샌드위치','브런치']],
  [/두부|계란|달걀|나물|무침/,['백반','한식']],
 ];
 const similar=rules.find(([pattern])=>pattern.test(main))?.[1]??[];
 return [...new Set([main,...similar])].filter(Boolean).slice(0,3);
}
export function mergeRestaurantMatches(groups:{keyword:string;places:NearbyRestaurant[]}[],hasOrigin:boolean):RestaurantMatch[]{
 const seen=new Map<string,RestaurantMatch>();
 groups.forEach((group,index)=>group.places.forEach(place=>{
  if(!seen.has(place.id))seen.set(place.id,{...place,match:index===0?'menu':'similar',keyword:group.keyword});
 }));
 const results=[...seen.values()];
 const keywords=groups.map(group=>group.keyword.replace(/\s/g,''));
 const relevance=(place:RestaurantMatch)=>keywords.some(word=>place.name.replace(/\s/g,'').includes(word))?2:keywords.some(word=>place.category.replace(/\s/g,'').includes(word))?1:0;
 return results.sort((a,b)=>hasOrigin?(a.distance??Infinity)-(b.distance??Infinity):relevance(b)-relevance(a));
}
