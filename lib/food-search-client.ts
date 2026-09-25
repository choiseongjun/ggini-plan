import type {FoodReference} from './food-reference';
const cache=new Map<string,{expires:number;value:Promise<{items:FoodReference[]}>}>();
export function hasCachedFoodSearch(query:string){
 return (cache.get(query)?.expires??0)>Date.now();
}
export function searchFoods(query:string):Promise<{items:FoodReference[]}>{
 const cached=cache.get(query);
 if(cached&&cached.expires>Date.now())return cached.value;
 if(cache.size>=60)cache.delete(cache.keys().next().value!);
 const value=fetch(`/api/food-reference?q=${encodeURIComponent(query)}`).then(async response=>{
  if(!response.ok)throw Error('Food search failed');
  const data=await response.json();
  if(!Array.isArray(data.items))throw Error('Invalid food results');
  return data as {items:FoodReference[]};
 });
 cache.set(query,{expires:Date.now()+300_000,value});
 value.catch(()=>{if(cache.get(query)?.value===value)cache.delete(query);});
 return value;
}
