export type RestaurantSearch={menu:string;area?:string;latitude?:number;longitude?:number;radius:number};
export type MapPoint={latitude:number;longitude:number};
export type NearbyRestaurant={id:string;name:string;category:string;address:string;phone:string;distance:number|null;url:string;position:MapPoint|null};
export function parseRestaurantSearch(value:unknown):RestaurantSearch|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.menu!=='string'||!v.menu.trim()||v.menu.length>60)return null;
 const radius=v.radius??3000;if(typeof radius!=='number'||![1000,3000,5000].includes(radius))return null;
 if(v.area!==undefined){
  if(typeof v.area!=='string'||v.area.trim().length<2||v.area.length>60||v.latitude!==undefined||v.longitude!==undefined)return null;
  return {menu:v.menu.trim(),area:v.area.trim(),radius};
 }
 if(typeof v.latitude!=='number'||!Number.isFinite(v.latitude)||v.latitude< -90||v.latitude>90||typeof v.longitude!=='number'||!Number.isFinite(v.longitude)||v.longitude< -180||v.longitude>180)return null;
 return {menu:v.menu.trim(),latitude:v.latitude,longitude:v.longitude,radius};
}
export function restaurantSearchParams(input:RestaurantSearch){
 const params=new URLSearchParams({query:`${input.area?`${input.area} `:''}${input.menu}`,category_group_code:'FD6',size:'10'});
 if(input.latitude!==undefined&&input.longitude!==undefined){params.set('x',String(input.longitude));params.set('y',String(input.latitude));params.set('radius',String(input.radius));params.set('sort','distance');}
 return params;
}
export function parseRestaurants(data:unknown,withDistance:boolean):NearbyRestaurant[]{
 if(!data||typeof data!=='object'||!('documents' in data)||!Array.isArray(data.documents))return [];
 const seen=new Set<string>();
 return data.documents.flatMap(d=>{
  if(!d||typeof d.id!=='string'||!/^\d+$/.test(d.id)||seen.has(d.id)||typeof d.place_name!=='string'||d.category_group_code!=='FD6')return [];
  seen.add(d.id);
  const distance=typeof d.distance==='string'&&d.distance.trim()!==''?Number(d.distance):NaN;
  const latitude=typeof d.y==='string'&&d.y.trim()?Number(d.y):NaN,longitude=typeof d.x==='string'&&d.x.trim()?Number(d.x):NaN;
  const position=Number.isFinite(latitude)&&Math.abs(latitude)<=90&&Number.isFinite(longitude)&&Math.abs(longitude)<=180?{latitude,longitude}:null;
  return [{id:d.id,name:d.place_name.slice(0,150),category:typeof d.category_name==='string'?d.category_name.split(' > ').slice(1).join(' · '):'',address:typeof d.road_address_name==='string'&&d.road_address_name?d.road_address_name:typeof d.address_name==='string'?d.address_name:'',phone:typeof d.phone==='string'&&/^[\d+() -]{5,25}$/.test(d.phone)?d.phone:'',distance:withDistance&&Number.isFinite(distance)&&distance>=0?distance:null,url:`https://place.map.kakao.com/${d.id}`,position}];
 }).slice(0,10);
}
