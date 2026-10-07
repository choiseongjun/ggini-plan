import type {NearbyRestaurant} from './nearby-restaurants';
const normalize=(name:string)=>name.replace(/\(주\)|주식회사|\s/g,'').toLowerCase();
export function storeLocations(data:unknown,store:string):{places:NearbyRestaurant[];exact:boolean}{
 if(!data||typeof data!=='object'||!('documents' in data)||!Array.isArray(data.documents))return {places:[],exact:false};
 const places:NearbyRestaurant[]=data.documents.flatMap(d=>{
  if(!d||typeof d.id!=='string'||!/^\d+$/.test(d.id)||typeof d.place_name!=='string'||typeof d.x!=='string'||!d.x.trim()||typeof d.y!=='string'||!d.y.trim())return [];
  const latitude=Number(d.y),longitude=Number(d.x);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<33||latitude>39||longitude<124||longitude>132)return [];
  if(!['MT1','CS2'].includes(d.category_group_code)&&!String(d.category_name).includes('백화점')&&!String(d.category_name).includes('슈퍼마켓'))return [];
  return [{id:d.id,name:d.place_name,address:typeof d.road_address_name==='string'&&d.road_address_name?d.road_address_name:typeof d.address_name==='string'?d.address_name:'',category:String(d.category_name||''),phone:typeof d.phone==='string'?d.phone:'',distance:null,url:`https://place.map.kakao.com/${d.id}`,position:{latitude,longitude}}];
 });
 const unique=[...new Map(places.map(p=>[p.id,p])).values()];
 const matched=unique.filter(p=>normalize(p.name)===normalize(store));
 return matched.length===1?{places:matched,exact:true}:{places:unique.slice(0,5),exact:false};
}
