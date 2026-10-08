'use client';

import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {homeVideoPicks} from '../lib/home-video-picks';
import {trackAnalytics} from '../lib/analytics';
import {useMealSave} from './taste/use-meal-save';
import './home-video-picks.css';

const picks=homeVideoPicks();
const motionQuery='(prefers-reduced-motion: reduce)';
function subscribeMotion(callback:()=>void){const query=window.matchMedia(motionQuery);query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);}

export function HomeVideoPicks(){
  const [auto,setAuto]=useState(true);
  const reducedMotion=useSyncExternalStore(subscribeMotion,()=>window.matchMedia(motionQuery).matches,()=>false);
  const rail=useRef<HTMLDivElement>(null);
  const interaction=useRef({hover:false,drag:false,until:0});
  const [playing,setPlaying]=useState<string|null>(null);
  const meal=useMealSave('video');
  const moving=auto&&!reducedMotion;
  function pauseInteraction(){interaction.current.until=performance.now()+8000;}
  function move(direction:number){
    pauseInteraction();
    const node=rail.current;if(!node)return;
    const width=node.querySelector('article')?.getBoundingClientRect().width??260;
    node.scrollBy({left:direction*(width+12),behavior:reducedMotion?'auto':'smooth'});
  }
  useEffect(()=>{
    const node=rail.current;
    if(!node||!moving||playing||meal.pending)return;
    let visible=false,frame=0,last=0,position=node.scrollLeft,direction=1,wasPaused=true;
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{threshold:0.2});
    observer.observe(node);
    function tick(now:number){
      if(!node)return;
      const state=interaction.current;
      const paused=!visible||document.hidden||state.hover||state.drag||now<state.until||node.contains(document.activeElement);
      if(paused){position=node.scrollLeft;wasPaused=true;}
      else{
        if(wasPaused){position=node.scrollLeft;last=now;wasPaused=false;}
        const max=node.scrollWidth-node.clientWidth;
        if(max>0){
          position=Math.max(0,Math.min(max,position+direction*Math.min(now-last,50)*0.018));
          node.scrollLeft=position;
          if((direction===1&&position>=max)||(direction===-1&&position<=0)){direction=position>=max?-1:1;state.until=now+1500;}
        }
      }
      last=now;frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[moving,playing,meal.pending]);
  return <section className="home-video-picks" aria-labelledby="home-video-title">
    <header><div><span>아직 안 당기세요?</span><h2 id="home-video-title">영상으로 골라봐요</h2></div><div className="home-video-controls"><button type="button" aria-label="이전 영상 카드" aria-controls="home-video-list" onClick={()=>move(-1)}>←</button><button type="button" aria-label={moving?'영상 카드 자동 이동 멈추기':'영상 카드 자동 이동 켜기'} aria-pressed={moving} disabled={reducedMotion} onClick={()=>setAuto(!auto)}>{moving?'Ⅱ 멈춤':'▶ 자동'}</button><button type="button" aria-label="다음 영상 카드" aria-controls="home-video-list" onClick={()=>move(1)}>→</button></div></header>
    <p>여러 채널에서 골랐어요. 보고 싶은 음식부터 골라보세요.</p>
    <div className="home-video-list" id="home-video-list" ref={rail} role="region" aria-label="요리 영상 카드, 좌우로 넘겨보기" tabIndex={0} onPointerEnter={e=>{if(e.pointerType==='mouse')interaction.current.hover=true;}} onPointerLeave={()=>{interaction.current.hover=false;interaction.current.drag=false;pauseInteraction();}} onPointerDown={()=>{interaction.current.drag=true;pauseInteraction();}} onPointerUp={()=>{interaction.current.drag=false;pauseInteraction();}} onPointerCancel={()=>{interaction.current.drag=false;pauseInteraction();}} onWheel={pauseInteraction} onFocusCapture={pauseInteraction} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}>{picks.map(({product,reason,video,publishedAt})=><article key={product.id}>
      {playing===video.id?<div className="home-video-player"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}`} title={`${video.title} — ${video.channel}`} referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/><button type="button" onClick={()=>setPlaying(null)}>영상 닫기</button></div>:<button type="button" className="home-video-cover" aria-label={`${product.name} 영상 보기`} onClick={()=>{setPlaying(video.id);trackAnalytics('home_video_opened');}}>
        {/* YouTube's original thumbnail retains the creator's visual attribution. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail} alt="" loading="lazy" width="320" height="180"/><span aria-hidden="true">▶ 영상 보기</span>
      </button>}
      <div className="home-video-copy"><small>{reason}</small><h3>{product.name}</h3><a href={video.url} target="_blank" rel="noopener noreferrer">{video.channel} · YouTube ↗</a><time dateTime={publishedAt} className="home-video-date">{publishedAt.replaceAll('-','.')} 업로드</time>
      <div className="home-video-actions"><Link href={`/ingredients?recipe=${encodeURIComponent(product.id)}`} onClick={()=>trackAnalytics('home_video_ingredients_clicked')}>내 재료와 비교하기 →</Link><button type="button" disabled={meal.busy||meal.pending||(meal.saved&&meal.savedName===product.name)} onClick={()=>{trackAnalytics('home_video_save_clicked');meal.save(product.name);}}>{meal.saved&&meal.savedName===product.name?'저녁에 담았어요 ✓':'오늘 저녁에 담기'}</button></div></div>
    </article>)}</div>
    <p className="home-video-note">재료는 영상 설명란 기준이에요. 식단에는 메뉴 이름을 저장해요.</p>
    {meal.authView}{meal.feedback}
  </section>;
}
