import {recipeVideoNotes} from '../../../../lib/recipe-video-notes';
export const runtime='nodejs';
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('video');
 if(!id||!/^[a-zA-Z0-9_-]{11}$/.test(id))return Response.json({error:'영상을 확인해 주세요.'},{status:400});
 const key=process.env.YOUTUBE_API_KEY;
 if(!key)return Response.json({error:'영상 설명을 불러올 준비 중이에요.'},{status:503});
 try{
  const url=new URL('https://www.googleapis.com/youtube/v3/videos');
  url.search=new URLSearchParams({part:'snippet',id,key,fields:'items(id,snippet(title,channelTitle,description))'}).toString();
  const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('YouTube unavailable');
  const data=await response.json(),video=data.items?.find((v:{id:string})=>v.id===id);
  if(!video)return Response.json({error:'삭제되었거나 공개되지 않은 영상이에요.'},{status:404});
  const description=typeof video.snippet?.description==='string'?video.snippet.description:'';
  return Response.json({notes:recipeVideoNotes(description),description:description.slice(0,12000)}, {headers:{'Cache-Control':'public, max-age=3600, s-maxage=86400'}});
 }catch{return Response.json({error:'영상 설명을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:503});}
}
