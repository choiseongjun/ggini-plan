'use client';
import {useEffect,useRef,useState} from 'react';
import type {MapPoint,NearbyRestaurant} from '../lib/nearby-restaurants';

type LatLng=object;
type Bounds={extend:(point:LatLng)=>void};
type MapInstance={fitBounds:(bounds:Bounds,options:{top:number;right:number;bottom:number;left:number;maxZoom:number})=>void;setCenter:(point:LatLng)=>void;autoResize:()=>void;destroy:()=>void};
type Overlay={setMap:(map:MapInstance|null)=>void};
type Maps={LatLng:new(lat:number,lng:number)=>LatLng;LatLngBounds:new()=>Bounds;Point:new(x:number,y:number)=>object;Map:new(node:HTMLElement,options:{center:LatLng;zoom:number})=>MapInstance;Marker:new(options:{position:LatLng;icon:{content:HTMLElement;anchor:object};map:MapInstance;zIndex:number})=>Overlay};
let loading:Promise<Maps>|null=null;
function loadMaps():Promise<Maps>{
 if(loading)return loading;
 const key=process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
 if(!key)return Promise.reject(new Error('지도 연결을 준비 중이에요. 아래 식당 목록과 상세 링크는 이용할 수 있어요.'));
 loading=new Promise<Maps>((resolve,reject)=>{
  const script=document.createElement('script');let settled=false;
  const timeout=setTimeout(()=>fail(),12000);
  function fail(){if(settled)return;settled=true;clearTimeout(timeout);script.remove();reject(new Error('지도를 불러오지 못했어요. 아래 목록에서 식당을 확인해 주세요.'));}
  script.src=`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}`;script.async=true;script.onerror=fail;
  script.onload=()=>{
   const maps=(window as Window&{naver?:{maps:Maps}}).naver?.maps;
   if(!maps){fail();return;}if(settled)return;settled=true;clearTimeout(timeout);resolve(maps);
  };
  document.head.appendChild(script);
 }).catch(error=>{loading=null;throw error;});
 return loading;
}
export function RestaurantMap({origin,places,onSelect}:{origin:MapPoint|null;places:NearbyRestaurant[];onSelect:(id:string)=>void}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<{map:MapInstance;maps:Maps}|null>(null);
 const [error,setError]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{
  let active=true;const node=container.current;const overlays:Overlay[]=[];let observer:ResizeObserver|undefined;let instance:MapInstance|undefined;
  loadMaps().then(maps=>{
   if(!active||!node)return;
   const first=origin??places.find(p=>p.position)?.position;if(!first)return;
   const center=new maps.LatLng(first.latitude,first.longitude),map=new maps.Map(node,{center,zoom:14});instance=map;mapRef.current={map,maps};
   const bounds=new maps.LatLngBounds();let count=0;
   function marker(point:MapPoint,node:HTMLElement,zIndex:number){const pos=new maps.LatLng(point.latitude,point.longitude);bounds.extend(pos);count++;overlays.push(new maps.Marker({position:pos,icon:{content:node,anchor:new maps.Point(18,36)},map,zIndex}));}
   if(origin){const node=document.createElement('span');node.className='restaurant-map-me';node.textContent='내 위치';node.title='기기에서 확인한 대략적인 위치';marker(origin,node,10);}
   places.forEach((p,index)=>{if(!p.position)return;const node=document.createElement('button');node.type='button';node.className='restaurant-map-pin';node.textContent=String(index+1);node.setAttribute('aria-label',`${index+1}. ${p.name} 선택`);node.onclick=()=>onSelect(p.id);marker(p.position,node,5);});
   if(count>1)map.fitBounds(bounds,{top:48,right:48,bottom:48,left:48,maxZoom:16});
   observer=new ResizeObserver(()=>map.autoResize());observer.observe(node);setError('');setReady(true);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'지도를 불러오지 못했어요.');});
  return()=>{active=false;observer?.disconnect();overlays.forEach(o=>o.setMap(null));instance?.destroy();mapRef.current=null;node?.replaceChildren();};
 },[origin,places,onSelect]);
 return <div className="restaurant-map"><div ref={container} className="restaurant-map-canvas" role="region" aria-label={origin?'내 위치와 주변 식당 지도':'검색된 식당 지도'}/>{error?<p role="status">{error}</p>:!ready?<p role="status">지도를 불러오고 있어요…</p>:<p>{origin&&'파란 표시: 내 위치(추정) · '}번호: 아래 식당 목록{origin&&<button type="button" onClick={()=>{const current=mapRef.current;if(current)current.map.setCenter(new current.maps.LatLng(origin.latitude,origin.longitude));}}>내 위치로</button>}</p>}</div>;
}
