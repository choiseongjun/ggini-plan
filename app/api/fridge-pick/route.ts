import {NextRequest,NextResponse} from 'next/server';
import {fridgePicks,isFridgeChip} from '../../../lib/fridge-pick';

// 홈 첫 화면: 누른 재료 칩으로 오늘 해 먹을 한 끼를 고른다. 레시피 데이터는 브라우저로 보내지 않는다.
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'요청을 확인해 주세요.'},{status:403});
 const input=await request.json().catch(()=>null) as {chips?:unknown;skip?:unknown}|null;
 const chips=input?.chips,skip=input?.skip??[];
 if(!Array.isArray(chips)||chips.length>20||!chips.every(isFridgeChip))return NextResponse.json({error:'재료를 다시 골라 주세요.'},{status:400});
 if(!Array.isArray(skip)||skip.length>60||skip.some(id=>typeof id!=='string'||id.length>200))return NextResponse.json({error:'요청을 확인해 주세요.'},{status:400});
 return NextResponse.json({picks:fridgePicks(chips,skip as string[],5)},{headers:{'Cache-Control':'no-store'}});
}
