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
export {restaurantMenuQuery as restaurantKeywords} from './restaurant-menu-query';
export function preferredRestaurantFilter(places:RestaurantMatch[]):'menu'|'similar'{
 return places.some(p=>p.match==='menu')?'menu':places.some(p=>p.match==='similar')?'similar':'menu';
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
