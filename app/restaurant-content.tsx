'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {RestaurantContent as Content} from '../lib/restaurant-content';
export function RestaurantContent({name,address}:{name:string;address:string}){
 const id=useId(),controller=useRef<AbortController|null>(null);
 const [open,setOpen]=useState(false),[data,setData]=useState<Content|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function load(){
  setBusy(true);setError('');const request=new AbortController();controller.current=request;
  try{const r=await fetch('/api/restaurant-content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,address}),signal:request.signal});const body=await r.json();if(!r.ok)throw Error(body.error);setData(body);}catch(e){if(!request.signal.aborted)setError(e instanceof Error?e.message:'검색하지 못했어요.');}finally{if(!request.signal.aborted)setBusy(false);}
 }
 return <section className="restaurant-content"><button type="button" aria-expanded={open} aria-controls={id} onClick={()=>{setOpen(!open);if(!open&&!data&&!busy)void load();}}>관련 사진·블로그 후기 <span aria-hidden="true">{open?'−':'+'}</span></button>{open&&<div id={id}>
  <p className="restaurant-content-note">네이버 검색 결과예요. 다른 지점이나 관련 없는 사진이 포함될 수 있어요. 방문자 인증 리뷰·별점은 제공하지 않아요.</p>
  {busy&&<p role="status">사진과 후기를 찾고 있어요…</p>}{error&&<p role="alert">{error} <button type="button" onClick={()=>void load()}>다시 시도</button></p>}
  {data&&<>{data.partial&&<p role="status">일부 검색 결과만 불러왔어요.</p>}<div className="restaurant-photos">{data.images.map((image,i)=><a key={`${image.url}-${i}`} href={`https://search.naver.com/search.naver?where=image&query=${encodeURIComponent(name+' '+address)}`} target="_blank" rel="noopener noreferrer" aria-label={`${name} 관련 이미지 검색 열기`}>
  {/* Search thumbnails come from multiple hosts; no server-side image proxy. */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={image.url} alt={image.title||`${name} 관련 검색 사진`} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}}/></a>)}</div>
  {!data.images.length&&<p>이 가게와 이름이 일치하는 사진을 찾지 못했어요.</p>}<div className="restaurant-blogs">{data.blogs.map(blog=><a key={blog.url} href={blog.url} target="_blank" rel="noopener noreferrer"><strong>{blog.title}</strong><p>{blog.description}</p><small>{blog.author} · 원문 보기 ↗</small></a>)}</div>{!data.blogs.length&&<p>이 가게와 이름이 일치하는 블로그 글을 찾지 못했어요.</p>}<a className="restaurant-search-more" href={`https://search.naver.com/search.naver?query=${encodeURIComponent(name+' '+address)}`} target="_blank" rel="noopener noreferrer">네이버에서 더 찾아보기 ↗</a><small>검색 제공 · NAVER</small></>}
 </div>}</section>;
}
