import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {collectOasis} from '../../../../../lib/oasis-collector';
import {invalidateCatalogCache} from '../../../../../lib/catalog-db';
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin||!await adminUser(request))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 try{const result=await collectOasis();invalidateCatalogCache();return Response.json(result,{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'수집 중이거나 연결에 문제가 있어요. 잠시 후 다시 확인해 주세요.'},{status:503});}
}
