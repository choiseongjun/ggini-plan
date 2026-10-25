import {NextRequest} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {validatedPhoto} from '../../../../lib/nutrition-photo';
import {diaryPhoto} from '../../../../lib/diary-photo';
import {logReference,logReferenceBatch} from '../../../../lib/intake-log';
export const runtime='nodejs';
// The user confirms the food and portion; no server AI inference is involved.
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인 후 이어서 저장해 주세요.',401);
  const form=await request.formData(),id=form.get('id');
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return authFailure('기록을 확인해 주세요.',400);
  let image;try{const photo=await validatedPhoto(form.get('photo'));if(!photo)return authFailure('사진을 선택해 주세요.',400);image=await diaryPhoto(photo.bytes);}catch{return authFailure('사진을 읽을 수 없어요. 8MB 이하 JPG, PNG, WEBP로 다시 선택해 주세요.',400);}
  if(form.has('items')){
   let items:unknown;try{items=JSON.parse(String(form.get('items')));}catch{return authFailure('음식 목록을 확인해 주세요.',400);}
   return await logReferenceBatch(user.id,{id,items,eatenAt:form.get('eatenAt'),mealSlot:form.get('mealSlot')},[image]);
  }
  return await logReference(user.id,{id,referenceCode:form.get('referenceCode'),portions:Number(form.get('portions')),eatenAt:form.get('eatenAt'),mealSlot:form.get('mealSlot')},[image]);
 }catch{return authFailure('저장 결과를 확인하지 못했어요. 사진은 임시 보관되어 있으니 다시 저장해 주세요.',503);}
}
