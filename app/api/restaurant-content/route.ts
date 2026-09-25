import {NextRequest} from 'next/server';
import {sameOrigin} from '../../../lib/auth';
import {parseRestaurantContent} from '../../../lib/restaurant-content';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return Response.json({error:'요청을 확인해 주세요.'},{status:403});
 let name:string,address:string;
 try{const raw=await request.text();if(raw.length>1000)throw Error();const data=JSON.parse(raw);if(typeof data.name!=='string'||typeof data.address!=='string')throw Error();name=data.name.trim();address=data.address.trim();if(!name||name.length>100||!address||address.length>160)throw Error();}catch{return Response.json({error:'가게 정보를 확인해 주세요.'},{status:400});}
 const client=process.env.NAVER_SEARCH_CLIENT_ID,secret=process.env.NAVER_SEARCH_CLIENT_SECRET;
 if(!client||!secret)return Response.json({error:'사진·후기 검색을 준비 중이에요.'},{status:503});
 // Only the selected business name and address are sent, never the user's coordinates.
 const query=`${name.replace(/cafe/gi,'').replace(/&/g,' ')} ${address.split(' ').slice(0,2).join(' ')}`;
 const results=await Promise.allSettled(['image','blog'].map(async kind=>{
  const params=new URLSearchParams({query,display:'20',sort:'sim',format:'json'});
  const response=await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/${kind}?${params}`,{headers:{'X-NCP-APIGW-API-KEY-ID':client,'X-NCP-APIGW-API-KEY':secret},next:{revalidate:3600},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Search unavailable');return response.json();
 }));
 if(results.every(x=>x.status==='rejected'))return Response.json({error:'사진·후기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:503});
 return Response.json(parseRestaurantContent(results[0].status==='fulfilled'?results[0].value:null,results[1].status==='fulfilled'?results[1].value:null,name),{headers:{'Cache-Control':'no-store'}});
}
