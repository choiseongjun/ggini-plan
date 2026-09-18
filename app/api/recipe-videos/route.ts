import {cookingVideoMenu} from '../../../lib/cooking-recipes';
import {parseRecipeVideos,relevantRecipeVideos} from '../../../lib/youtube-recipes';
export const runtime='nodejs';
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('dish');
 const menu=id&&id.length<=2000?cookingVideoMenu(id):null;
 if(!menu)return Response.json({error:'등록된 요리를 선택해 주세요.'},{status:400});
 const fallback=`https://www.youtube.com/results?search_query=${encodeURIComponent(menu.query)}`;
 const key=process.env.YOUTUBE_API_KEY;
 if(!key)return Response.json({error:'영상 검색을 준비 중이에요.',fallback},{status:503});
 try{
  const url=new URL('https://www.googleapis.com/youtube/v3/search');
  url.search=new URLSearchParams({part:'snippet',type:'video',q:menu.query,maxResults:'12',regionCode:'KR',relevanceLanguage:'ko',safeSearch:'strict',videoEmbeddable:'true',videoDuration:'medium',key}).toString();
  // A finite menu allowlist and shared 24-hour cache bound search quota use.
  const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return Response.json({error:'지금은 영상을 불러오기 어려워요. 유튜브에서 직접 찾아볼 수 있어요.',fallback},{status:503});
  return Response.json({videos:relevantRecipeVideos(parseRecipeVideos(await response.json(),12),menu.name),fallback},{headers:{'Cache-Control':'public, max-age=3600, s-maxage=86400'}});
 }catch{return Response.json({error:'영상 검색 연결이 지연되고 있어요.',fallback},{status:503});}
}
