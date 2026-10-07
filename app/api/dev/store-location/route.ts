import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {storeLocations} from '../../../../lib/store-locations';
export const runtime='nodejs';
let known:Promise<Set<string>>|undefined;
let knownModified=0;
const cache=new Map<string,{expires:number;value:ReturnType<typeof storeLocations>}>();
export async function POST(request:Request){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 const origin=request.headers.get('origin');
 let allowed=false;
 try{const url=new URL(origin||'');allowed=url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)&&url.host===request.headers.get('host');}catch{}
 if(!allowed)return Response.json({error:'요청을 확인해주세요.'},{status:403});
 let store:string;
 try{const raw=await request.text();if(raw.length>500)throw Error();const input=JSON.parse(raw);if(typeof input.store!=='string'||input.store.length>150)throw Error();store=input.store;}catch{return Response.json({error:'판매점을 확인해주세요.'},{status:400});}
 try{
  const datasetPath=path.join(process.cwd(),'data/regional-prices/preview.json');
  const modified=(await stat(datasetPath)).mtimeMs;
  if(modified!==knownModified){known=undefined;knownModified=modified;}
  known??=readFile(datasetPath,'utf8').then(text=>new Set<string>(JSON.parse(text).tprice.flatMap((p:{offers:{store:string}[]})=>p.offers.map(o=>o.store)))).catch(e=>{known=undefined;throw e;});
  if(!(await known).has(store))return Response.json({error:'수집된 판매점만 조회할 수 있어요.'},{status:400});
  const cached=cache.get(store);if(cached&&cached.expires>Date.now())return Response.json(cached.value);
  const key=process.env.KAKAO_REST_API_KEY;if(!key)return Response.json({error:'지도 검색 연결을 준비 중이에요.'},{status:503});
  const params=new URLSearchParams({query:store.replace(/\(주\)/g,''),size:'15'});
  const response=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,{headers:{Authorization:`KakaoAK ${key}`},signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!response.ok)throw Error();
  const value=storeLocations(await response.json(),store);cache.set(store,{expires:Date.now()+3600000,value});
  return Response.json(value);
 }catch{return Response.json({error:'위치 검색이 지연되고 있어요. 잠시 후 다시 확인해주세요.'},{status:503});}
}
