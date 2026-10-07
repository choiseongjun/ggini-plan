'use client';
import {useState} from 'react';
import {getImageProps} from 'next/image';
import {BackButton,Button,LinkButton,Notice} from '../components/ui';
import {tasteFoods,tasteMask,tasteResult} from '../../lib/taste-atlas';
import s from './taste.module.css';
import TasteRoulette from './roulette';
import TasteHomeCta from './home-cta';
import {useMealSave} from './use-meal-save';
const sheet=getImageProps({src:'/taste/food-sheet.png',alt:'음식 여섯 가지',width:768,height:512}).props.src;
function FoodPhoto({index}:{index:number;hero?:boolean}){return <div className={s.foodPhoto} role="img" aria-label={`${tasteFoods[index].name} · AI 예시 이미지`} style={{backgroundImage:`url("${sheet}")`,backgroundPosition:`${(index%3)*50}% ${index<3?0:100}%`}}/>;}
export default function TasteAtlas({friend,initial}:{friend:number|null;initial:number|null}){
 const mealSave=useMealSave();
 const [answers,setAnswers]=useState<boolean[]>(initial===null?[]:tasteFoods.map((_,i)=>!!(initial&(1<<i))));
 const [spinning,setSpinning]=useState(false);
 const [notice,setNotice]=useState(''),[shareLink,setShareLink]=useState(''),[pick,setPick]=useState(0);
 const done=answers.length===tasteFoods.length,mask=tasteMask(answers),result=tasteResult(mask);
 const matched=friend===null?[]:tasteFoods.filter((_,i)=>!!(friend&mask&(1<<i)));
 const candidates=friend!==null&&matched.length?matched:result.liked;
 const chosen=mealSave.savedName?tasteFoods.find(f=>f.name===mealSave.savedName)??null:candidates.length?candidates[pick%candidates.length]:null;
 function answer(yes:boolean){if(done)return;const next=[...answers,yes];setAnswers(next);if(next.length===6){const value=tasteMask(next);try{localStorage.setItem('ggini-taste-v1',String(value));}catch{} const url=new URL(window.location.href);url.searchParams.set('me',String(value));window.history.replaceState(null,'',url);}}
 function reset(){setAnswers([]);setPick(0);mealSave.resetSaved();setNotice('');setShareLink('');const url=new URL(window.location.href);url.searchParams.delete('me');window.history.replaceState(null,'',url);}
 async function share(){const url=new URL('/taste',window.location.origin);url.searchParams.set('friend',String(mask));setShareLink(url.toString());try{if(navigator.share)await navigator.share({title:'우리, 입맛도 통할까?',text:`나는 ‘${result.title}’. 너도 골라봐!`,url:url.toString()});else{await navigator.clipboard.writeText(url.toString());setNotice('링크를 복사했어요. 친구에게 보내 봐요.');}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setNotice('아래 링크를 길게 눌러 복사해 주세요.');}}
 function save(){if(chosen)mealSave.save(chosen.name);}
 if(mealSave.authView)return mealSave.authView;
 return <main className={s.page}><nav className={s.nav}><BackButton href="/">오늘로</BackButton><span>끼니플랜 <b>입맛 도감</b></span></nav>{mealSave.feedback}
 {!done?<><header className={s.intro}><span className={s.eyebrow}>{friend===null?'SIX BITES, YOUR TASTE':'우리, 입맛도 통할까?'}</span><h1>지금 이 한 입,<br/><em>당기나요?</em></h1><p>{friend===null?'생각 말고, 입맛 가는 대로.':'친구의 답은 잠깐 비밀. 내 취향부터 골라요.'}</p></header><div className={s.progress} aria-label={`${answers.length+1}번째 음식, 전체 6개`}>{tasteFoods.map((_,i)=><span key={i} data-active={i<=answers.length}/>)}<b>{String(answers.length+1).padStart(2,'0')} / 06</b></div><article className={s.food} key={answers.length}><FoodPhoto index={answers.length} hero/><span className={s.stamp}>오늘의 입맛 수집 중</span><div className={s.caption}><span>{tasteFoods[answers.length].line}</span><h2>{tasteFoods[answers.length].name}</h2></div></article><div className={s.controls}><Button variant="secondary" size="lg" onClick={()=>answer(false)}>오늘은 패스</Button><Button size="lg" onClick={()=>answer(true)}>당긴다!</Button></div><footer className={s.footer}>{answers.length>0?<Button variant="ghost" onClick={()=>setAnswers(answers.slice(0,-1))}>이전 음식</Button>:<span>입력도 가입도 없이 · 사진 6장만 골라요</span>}</footer><small className={s.imageNote}>음식 사진은 AI로 만든 예시예요.</small></>:<>
 <header className={s.intro}><span className={s.eyebrow}>MY TASTE COLLECTION</span><h1>오늘의 나,<br/><em>이런 맛이네요.</em></h1></header><TasteHomeCta/><section className={s.result}><div className={s.resultTop}><span>입맛 도감</span><b>선택 {result.liked.length} / 6</b></div><h2>{result.title}</h2><div className={s.mosaic}>{tasteFoods.map((f,i)=><div key={f.name} data-liked={!!(mask&(1<<i))}><div className={s.tile}><FoodPhoto index={i}/></div><span>{f.name}</span><small>{mask&(1<<i)?'당긴다':'오늘은 패스'}</small></div>)}</div><p>{result.liked.length?result.liked.map(f=>f.tag).join(' · '):'익숙한 여섯 메뉴가 당기지 않았어요. 다른 메뉴를 찾아봐요.'}</p><small>이번 선택으로 만든 가벼운 취향 카드예요.</small></section>
 {friend!==null&&<section className={s.match}><span className={s.eyebrow}>OUR NEXT MEAL</span><h2>{matched.length?`우리 둘 다 당기는 메뉴 ${matched.length}개`:'오늘은 서로 다른 입맛이네요'}</h2><p>{matched.length?matched.map(f=>f.name).join(' · '):'억지로 하나를 고르지 말고, 각자 좋아하는 메뉴부터 이야기해 봐요.'}</p></section>}
 {candidates.length>1&&<TasteRoulette key={`${mask}-${friend}`} names={candidates.map(f=>f.name)} disabled={mealSave.busy||mealSave.pending} onStart={()=>{setSpinning(true);mealSave.resetSaved();setNotice('');}} onPick={index=>{setPick(index);setSpinning(false);}}/>}
 {chosen?<section className={s.meal}><div className={s.mealImage}><FoodPhoto index={tasteFoods.indexOf(chosen)}/></div><div><span className={s.eyebrow}>{matched.length?'같이 먹을 한 끼':'오늘 당긴 메뉴 중 한 끼'}</span><h2>{chosen.name}</h2><p>{chosen.tag}</p></div><Button block disabled={mealSave.busy||mealSave.saved||spinning||mealSave.pending} onClick={save}>{mealSave.saved?'식단에 저장했어요':mealSave.busy?'저장하고 있어요…':'이 메뉴 저장하고 다시 보기'}</Button></section>:<LinkButton href="/" block>다른 식단 추천받기</LinkButton>}
 <Button block size="lg" variant="secondary" onClick={share}>친구와 입맛 맞춰보기</Button><p className={s.explain}>친구도 6장을 고르면, 둘 다 당기는 메뉴가 나와요.<br/>공유 링크에는 이번 음식 선택만 담겨요.</p>{notice&&<Notice>{notice}</Notice>}{shareLink&&<a className={s.shareLink} href={shareLink}>{shareLink}</a>}<Button variant="ghost" disabled={spinning||mealSave.busy||mealSave.pending} onClick={reset}>다시 골라보기</Button></>}
 </main>;
}
