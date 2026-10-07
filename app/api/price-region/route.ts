import {NextRequest} from 'next/server';
import {priceRegionFromHeaders} from '../../../lib/ip-price-region';
export const runtime='nodejs';
// 접속 IP로 추정한 시·도만 돌려준다. 위치를 저장하거나 기록하지 않는다.
export function GET(request:NextRequest){
 return Response.json({region:priceRegionFromHeaders(request.headers)},{headers:{'Cache-Control':'private, no-store'}});
}
