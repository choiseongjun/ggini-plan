'use client';
import {useId,useState} from 'react';
import type {RecipeVideoNotes as Notes} from '../lib/recipe-video-notes';
type Result={notes:Notes;description:string};
const cache=new Map<string,Result>();
export function RecipeVideoNotes({videoId,url}:{videoId:string;url:string}){
 const panelId=useId();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [data,setData]=useState<Result|null>(()=>cache.get(videoId)??null);
 async function load(){
  setBusy(true);setError('');
  try{
   const response=await fetch(`/api/recipe-videos/notes?video=${encodeURIComponent(videoId)}`);
   const result=await response.json();if(!response.ok)throw new Error(result.error);
   cache.set(videoId,result);setData(result);
  }catch(e){setError(e instanceof Error?e.message:'설명을 불러오지 못했어요.');}finally{setBusy(false);}
 }
 const available=data&&Object.values(data.notes).some(items=>items.length>0);
 return <div className="recipe-reading">
  <button type="button" className="recipe-reading-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>{setOpen(!open);if(!open&&!data&&!busy)void load();}}>
   <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM9 11h6M9 15h6M9 7h3"/></svg>
   {open?'글 설명 접기':'요리 설명 글로 보기'}<span aria-hidden="true">{open?'−':'+'}</span>
  </button>
  {open&&<div id={panelId} className="recipe-reading-body">
   <p className="recipe-reading-source">영상 설명란에서 정리했어요. 영상 전체나 자막을 요약한 내용은 아니에요.</p>
   {busy&&<p role="status">재료와 조리 설명을 불러오고 있어요…</p>}
   {error&&<div role="alert"><p>{error}</p><button type="button" onClick={()=>void load()} disabled={busy}>다시 불러오기</button></div>}
   {data&&<>{available?<>
    {!!data.notes.ingredients.length&&<section><h4>재료와 양념</h4><ul>{data.notes.ingredients.map((line,i)=><li key={i}>{line}</li>)}</ul></section>}
    {!!data.notes.steps.length&&<section><h4>조리 순서</h4><ol>{data.notes.steps.map((line,i)=><li key={i}>{line}</li>)}</ol></section>}
    {!!data.notes.tips.length&&<section><h4>참고할 점</h4><ul>{data.notes.tips.map((line,i)=><li key={i}>{line}</li>)}</ul></section>}
    {!data.notes.steps.length&&<p>설명란에 정리된 조리 순서가 없어, 만드는 과정은 영상에서 확인해 주세요.</p>}
   </>:<p>이 영상은 설명란에 정리할 수 있는 레시피가 충분하지 않아요. 영상에서 만드는 과정을 확인해 주세요.</p>}
   {data.description&&<details><summary>영상 설명 원문 보기</summary><p className="recipe-reading-original">{data.description}</p></details>}
   <a href={url} target="_blank" rel="noopener noreferrer">출처 · YouTube 영상 보기 ↗</a>
   </>}
  </div>}
 </div>;
}
