import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {dispatchMealReminders} from '../../../../lib/meal-push';
import {dispatchNativeMealReminders} from '../../../../lib/native-meal-push';
export const runtime='nodejs';
export const maxDuration=60;

// GitHub Actions 예약 작업이 15분마다 부른다(.github/workflows/meal-reminders.yml). CRON_SECRET이 맞아야 한다.
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET?.trim(),given=request.headers.get('x-cron-secret')??'';
 if(!secret||Buffer.byteLength(given)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(given),Buffer.from(secret)))return new NextResponse(null,{status:401});
 try{
  const results=await Promise.allSettled([dispatchMealReminders(),dispatchNativeMealReminders()]);
  const web=results[0].status==='fulfilled'?results[0].value:{error:'Web push dispatch failed'};
  const native=results[1].status==='fulfilled'?results[1].value:{error:'FCM dispatch failed'};
  return NextResponse.json({web,native},{status:'error' in web||'error' in native||('failed' in native&&native.failed>0)?503:200,headers:{'Cache-Control':'no-store'}});
 }
 catch{return NextResponse.json({error:'발송 중 오류'},{status:503});}
}
