import {NextRequest,NextResponse} from 'next/server';
import sharp from 'sharp';
import {sessionUser,sameOrigin} from '../../../../lib/auth';
import {validatedPhoto} from '../../../../lib/nutrition-photo';
import {analyzeGroqPhoto,PhotoAnalysisError} from '../../../../lib/groq-food-photo';
import {reservePhotoAnalysis} from '../../../../lib/photo-analysis-quota';
export const runtime='nodejs';
export const maxDuration=60;
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return json({error:'요청을 확인해 주세요.'},403);
 try{
  const user=await sessionUser(request);if(!user)return json({error:'무료 분석 이용 횟수를 확인하려면 로그인해 주세요.'},401);
  if(!process.env.GROQ_API_KEY)return json({error:'사진 분석 연결을 준비 중이에요. 지금은 음식 이름으로 기록해 주세요.'},503);
  if(Number(request.headers.get('content-length'))>4*1024*1024)return json({error:'사진은 4MB 이하로 선택해 주세요.'},413);
  let bytes:Buffer;
  try{
   const form=await request.formData();
   if(form.get('consent')!=='groq-photo-v1')return json({error:'사진을 Groq로 전송하는 데 동의해 주세요.'},400);
   const photo=await validatedPhoto(form.get('photo'));if(!photo||photo.bytes.length>4*1024*1024)return json({error:'4MB 이하 사진을 선택해 주세요.'},400);
   bytes=await sharp(photo.bytes,{limitInputPixels:40_000_000}).rotate().resize(1024,1024,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();
  }catch{return json({error:'사진을 읽지 못했어요. 다른 사진을 선택해 주세요.'},400);}
  const limited=await reservePhotoAnalysis(user.id);if(limited)return json({error:limited},429);
  return json({foods:await analyzeGroqPhoto(bytes),provider:'Groq'});
 }catch(error){return json({error:error instanceof PhotoAnalysisError?error.message:'사진 분석을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.'},error instanceof PhotoAnalysisError?error.status:503);}
}
