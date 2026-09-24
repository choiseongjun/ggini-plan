import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {dispatchMealReminders} from '../../../../lib/meal-push';
export const runtime='nodejs';
export const maxDuration=60;

// GitHub Actions 예약 작업이 15분마다 부른다(.github/workflows/meal-reminders.yml). CRON_SECRET이 맞아야 한다.
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET?.trim(),given=request.headers.get('x-cron-secret')??'';
 if(!secret||given.length!==secret.length||!timingSafeEqual(Buffer.from(given),Buffer.from(secret)))return new NextResponse(null,{status:401});
 try{return NextResponse.json(await dispatchMealReminders(),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'발송 중 오류'},{status:503});}
}
