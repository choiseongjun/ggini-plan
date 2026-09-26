'use client';
import {useEffect,useState} from 'react';
import {recipeVideoDishId,type RecipeVideo} from '../lib/youtube-recipes';
import './recipe-videos.css';
import {RecipeVideoNotes} from './recipe-video-notes';
export function RecipeVideos({dishId}:{dishId:string}){
 return <RecipeVideosForDish key={recipeVideoDishId(dishId)} id={recipeVideoDishId(dishId)}/>;
}
function RecipeVideosForDish({id}:{id:string}){
 const [data,setData]=useState<VideoResponse|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;getVideos(id).then(result=>{if(active){setData(result);setLoading(false);}});return()=>{active=false;};},[id]);
 async function retry(){setLoading(true);requests.delete(id);setData(await getVideos(id));setLoading(false);}
 return <section className="recipe-videos" aria-label="관련 YouTube 조리 영상"><strong>만드는 방법, 영상과 글로 보기</strong><p>메뉴에 맞는 하루한끼 영상을 먼저 보여드리고, 다른 채널 영상도 함께 찾아요. 영상의 재료·분량은 장보기 목록과 다를 수 있어요.</p>{loading&&<p role="status">조리 영상을 찾고 있어요…</p>}{data&&<>{data.error&&<><p role="status">{data.error}</p><button type="button" disabled={loading} onClick={retry}>다시 불러오기</button></>}{data.videos?.length===0&&<p>이 메뉴에 맞는 영상을 찾지 못했어요.</p>}<div className="recipe-video-list">{data.videos?.map(v=><article key={v.id}><iframe src={`https://www.youtube-nocookie.com/embed/${v.id}`} title={`${v.title} — ${v.channel}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/><strong>{v.title}</strong><small>{v.channel}</small><RecipeVideoNotes videoId={v.id} url={v.url}/><a href={v.url} target="_blank" rel="noopener noreferrer">YouTube에서 보기 ↗</a></article>)}</div>{data.fallback&&<a href={data.fallback} target="_blank" rel="noopener noreferrer">다른 조리 영상 더 찾아보기 ↗</a>}</>}</section>;
}
type VideoResponse={videos?:RecipeVideo[];error?:string;fallback?:string};
const requests=new Map<string,Promise<VideoResponse>>();
function getVideos(id:string):Promise<VideoResponse>{
 const existing=requests.get(id);if(existing)return existing;
 const promise=fetch(`/api/recipe-videos?v=4&dish=${encodeURIComponent(id)}`).then(r=>r.json()).catch(()=>({error:'영상을 불러오지 못했어요. 다시 시도해 주세요.'}));
 requests.set(id,promise);return promise;
}
