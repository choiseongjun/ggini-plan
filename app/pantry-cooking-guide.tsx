'use client';
import {sourceMealRole} from '../lib/source-recipe';
import {useState} from 'react';
import type {PlanProduct} from '../lib/shopping-plan';
import './recipe-videos.css';

export function PantryCookingGuide({product}:{product:PlanProduct}){
 const [videos,setVideos]=useState(false),[step,setStep]=useState(0);
 const source=product.sourceRecipe;
 if(!source)return <p>이 메뉴는 재료와 조리법이 연결된 출처가 아직 없어요. 내 주방에서 다시 추천받아 주세요.</p>;
 return <section className="pantry-cooking-guide" aria-label="따라 할 레시피">
  <h3>재료 확인하고 바로 만들어요</h3>
  <p className="pantry-meal-role">{sourceMealRole(product.name)}{sourceMealRole(product.name)==='반찬·곁들임'?' · 밥 등 함께 먹을 음식을 준비해 주세요.':''}</p>
  <a href={source.video.url} target="_blank" rel="noopener noreferrer">{source.video.title} · {source.video.channel} ↗</a>
  <p className="pantry-muted">{source.servingLabel}. 필요한 재료와 만드는 법은 모두 이 영상 설명란 기준이에요. 양은 자동 환산하지 않았어요.</p>
  <h4>이 레시피의 재료·분량</h4><ul>{source.ingredients.map((i,index)=><li key={index}>{i.label}{i.optional ? ' · 선택' : ''}</li>)}</ul>
  <div className="pantry-cooking-step"><h4>조리 순서 <span>{step+1} / {source.steps.length}</span></h4><p aria-live="polite">{source.steps[step]}</p><div><button type="button" disabled={step===0} onClick={()=>setStep(n=>n-1)}>이전 단계</button><button type="button" disabled={step===source.steps.length-1} onClick={()=>setStep(n=>n+1)}>다음 단계</button></div></div>
  <details className="pantry-menu-sides"><summary>전체 조리 순서 보기</summary><ol>{source.steps.map((line,i)=><li key={i}>{line}</li>)}</ol></details>
  {source.tips.length>0&&<details><summary>출처의 요리 팁</summary><ul>{source.tips.map((line,i)=><li key={i}>{line}</li>)}</ul></details>}
  <details className="pantry-menu-sides" onToggle={e=>setVideos(e.currentTarget.open)}><summary>이 레시피 영상 보기</summary>{videos&&<div className="recipe-videos"><div className="recipe-video-list"><article><iframe src={`https://www.youtube-nocookie.com/embed/${source.video.id}`} title={source.video.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/><a href={source.video.url} target="_blank" rel="noopener noreferrer">YouTube에서 보기 ↗</a></article></div></div>}</details>
 </section>;
}
