import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {collectionInput} from '../../../../../lib/catalog-sellers';
import {collectCatalog} from '../../../../../lib/catalog-collector';
import {invalidateCatalogCache} from '../../../../../lib/catalog-db';
export const maxDuration=60;
export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 let input;try{const raw=await r.text();if(raw.length>500)throw new Error();input=collectionInput(JSON.parse(raw));}catch{}
 if(!input)return Response.json({error:'판매처·카테고리와 1~2000개의 수집 개수를 확인해 주세요.'},{status:400});
 try{const result=await collectCatalog(input);invalidateCatalogCache();return Response.json(result,{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof Error&&/수집|판매처/.test(e.message)?e.message:'상품 수집을 완료하지 못했어요. 다시 실행해 주세요.'},{status:503});}
}
