import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {collectionCategories,type CollectionCategory} from '../../../../../lib/catalog-sellers';
import {collectCoupang,coupangConfigured} from '../../../../../lib/coupang-collector';
import {invalidateCatalogCache} from '../../../../../lib/catalog-db';
export const maxDuration=60;

function parseInput(raw:string){
 let body:unknown; try{body=JSON.parse(raw);}catch{return null;}
 const v=body as Record<string,unknown>|null;
 if(!v||typeof v.keyword!=='string'||!v.keyword.trim()||v.keyword.length>60)return null;
 if(!Object.hasOwn(collectionCategories,String(v.category)))return null;
 if(!Number.isInteger(v.count)||Number(v.count)<1||Number(v.count)>100)return null;
 return {keyword:v.keyword.trim(),category:v.category as CollectionCategory,count:Number(v.count)};
}

export async function GET(request:NextRequest){
 if(!await adminUser(request))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 return Response.json({configured:coupangConfigured()},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 if(!coupangConfigured())return Response.json({error:'쿠팡 파트너스 API 키가 설정되지 않았어요. 환경변수 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY를 확인해 주세요.'},{status:400});
 let input;try{const raw=await r.text();if(raw.length>500)throw new Error();input=parseInput(raw);}catch{}
 if(!input)return Response.json({error:'검색어·카테고리와 1~100개 사이의 수집 개수를 확인해 주세요.'},{status:400});
 try{const result=await collectCoupang(input);invalidateCatalogCache();return Response.json(result,{headers:{'Cache-Control':'no-store'}});}
 catch(e){return Response.json({error:e instanceof Error&&/설정|수집|API/.test(e.message)?e.message:'상품 수집을 완료하지 못했어요. 다시 실행해 주세요.'},{status:503});}
}
