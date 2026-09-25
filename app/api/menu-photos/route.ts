import {NextRequest} from 'next/server';
import {searchNaverDishImages} from '../../../lib/naver-dish-images';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const name=request.nextUrl.searchParams.get('name')?.trim();
 if(!name||name.length>100)return Response.json({error:'메뉴 이름을 확인해 주세요.'},{status:400});
 try{
  const images=await searchNaverDishImages(name);
  return Response.json({images,source:'naver'},{headers:{'Cache-Control':'public, max-age=3600, s-maxage=86400'}});
 }catch{
  return Response.json({error:'사진을 불러오지 못했어요.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
