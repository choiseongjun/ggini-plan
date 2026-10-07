'use client';
import {useEffect,useRef,useState} from 'react';
import Image,{getImageProps} from 'next/image';
import {BackButton,Button,LinkButton,Notice} from '../components/ui';
import {tasteFoods} from '../../lib/taste-atlas';
import {commonQuizMenus,quizMask,quizMenuIndices,quizScore,quizSelections,quizVerdict,tasteQuestions} from '../../lib/taste-quiz';
import {trackAnalytics} from '../../lib/analytics';
import TasteRoulette from './roulette';
import TasteHomeCta from './home-cta';
import {createQuizCard} from './share-card';
import s from './taste.module.css';
const sheet=getImageProps({src:'/taste/food-sheet.png',alt:'음식 사진',width:768,height:512}).props.src;
function FoodPhoto({index}:{index:number}){return <div className={s.foodPhoto} aria-hidden="true" style={{backgroundImage:`url("${sheet}")`,backgroundPosition:`${index%3*50}% ${index<3?0:100}%`}}/>;}
type Mode='create'|'guess'|'self'|'result';
export default function TasteQuiz({target,initial,initialGuess,invalid=false}:{target:number|null;initial:number|null;initialGuess:number|null;invalid?:boolean}){
 const [mine,setMine]=useState<number|null>(initial),[guess,setGuess]=useState<number|null>(initialGuess);
 const [mode,setMode]=useState<Mode>(target!==null?(initialGuess===null?'guess':'result'):(initial===null?'create':'result'));
 const [answers,setAnswers]=useState<number[]>([]),[notice,setNotice]=useState(''),[shareLink,setShareLink]=useState('');
 const [cardPreview,setCardPreview]=useState('');
 const [spinning,setSpinning]=useState(false),[pick,setPick]=useState(0),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[login,setLogin]=useState(false),[exporting,setExporting]=useState(false);
 const cardFile=useRef<File|null>(null);
 const heading=useRef<HTMLHeadingElement>(null),saveLock=useRef(false),shareLock=useRef(false),saveId=useRef<string|null>(null),entered=useRef(false);
 const quizDone=target!==null&&guess!==null,ownDone=mine!==null;
 const score=quizDone?quizScore(target,guess):0;
 const menus=mine===null?[]:target===null?quizMenuIndices(mine):commonQuizMenus(target,mine);
 const chosen=menus.length?tasteFoods[menus[pick%menus.length]]:null;
 const active=mode!=='result',question=tasteQuestions[answers.length];
 useEffect(()=>{if(!entered.current){entered.current=true;trackAnalytics(target===null?'taste_quiz_opened':'taste_invite_opened');}},[target]);
 useEffect(()=>()=>{if(cardPreview)URL.revokeObjectURL(cardPreview);},[cardPreview]);
 function writeUrl(key:'me'|'guess',value:number){const url=new URL(window.location.href);if(invalid){url.search='';}url.searchParams.set('v','2');url.searchParams.set(key,String(value));window.history.replaceState(null,'',url);}
 function focusHeading(){requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'});});}
 function answer(side:number){
  const next=[...answers,side];
  if(next.length===6){const mask=quizMask(next);
   if(mode==='guess'){setGuess(mask);writeUrl('guess',mask);trackAnalytics('taste_guess_completed');}
   else{setMine(mask);writeUrl('me',mask);trackAnalytics(target===null?'taste_quiz_created':'taste_friend_created');}
   setAnswers([]);setMode('result');
  }else setAnswers(next);
  focusHeading();
 }
 function startOwn(){setAnswers([]);setMode('self');setNotice('');focusHeading();}
 function resetOwn(){setAnswers([]);setMine(null);setMode(target===null?'create':'self');setSaved(false);setPick(0);setNotice('');setShareLink('');setCardPreview('');saveId.current=null;const url=new URL(window.location.href);url.searchParams.delete('me');window.history.replaceState(null,'',url);focusHeading();}
 function invitation(){const url=new URL('/taste',window.location.origin);url.searchParams.set('v','2');url.searchParams.set('q',String(mine));return url.toString();}
 async function share(){
  if(mine===null||shareLock.current)return;shareLock.current=true;
  const url=invitation();setShareLink(url);trackAnalytics('taste_share_clicked');
  try{if(navigator.share){await navigator.share({title:'너, 내 입맛 얼마나 알아?',text:'우리 그렇게 같이 먹었는데, 6개 다 맞힐 수 있어? 내 입맛 맞혀봐.',url});trackAnalytics('taste_share_completed');}
   else{await navigator.clipboard.writeText(url);setNotice('도전 링크를 복사했어요. 친구에게 보내 봐요.');trackAnalytics('taste_link_copied');}
  }catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setNotice('아래 도전 링크를 길게 눌러 복사해 주세요.');}finally{shareLock.current=false;}
 }
 async function exportCard(){
  if(exporting)return;setExporting(true);setNotice('');
  try{const cardTarget=quizDone?target:mine;if(cardTarget===null)return;
   const blob=await createQuizCard(cardTarget,quizDone?guess:null),file=new File([blob],'끼니플랜-입맛퀴즈.png',{type:'image/png'});
   setCardPreview(URL.createObjectURL(blob));
   cardFile.current=file;
   trackAnalytics('taste_card_exported');
  }catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setNotice('이미지를 저장하지 못했어요. 도전 링크를 공유해 주세요.');}finally{setExporting(false);}
 }
 async function shareImage(){
  const file=cardFile.current;if(!file)return;
  try{if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'내 입맛 맞혀봐'});else setNotice('이 브라우저에서는 PNG 이미지 저장을 눌러 저장한 뒤 공유해 주세요.');}
  catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setNotice('PNG 이미지 저장을 눌러 저장한 뒤 공유해 주세요.');}
 }
 async function save(){
  if(!chosen||saveLock.current||spinning||saved)return;saveLock.current=true;setSaving(true);setNotice('');
  try{const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   saveId.current??=crypto.randomUUID();const res=await fetch('/api/manual-meal-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:saveId.current,name:chosen.name,day,slot:'dinner'})});
   if(res.status===401){setLogin(true);setNotice('식단에 담으려면 로그인이 필요해요. 로그인 후 이 화면에서 다시 담아 주세요.');return;}
   if(!res.ok)throw Error();setSaved(true);setNotice('오늘 저녁 식단에 담았어요.');trackAnalytics('taste_meal_saved');
  }catch{setNotice('담지 못했어요. 다시 시도해 주세요.');}finally{setSaving(false);saveLock.current=false;}
 }
 return <main className={s.page}>
  <nav className={s.nav}><BackButton href="/">오늘로</BackButton><span>끼니플랜 <b>입맛 퀴즈</b></span></nav>
  {invalid&&<Notice>링크를 확인하지 못했어요. 새 입맛 퀴즈를 만들어 친구에게 보내 봐요.</Notice>}
  {active?<>
   <header className={s.intro}><span className={s.eyebrow}>{mode==='guess'?'친구가 보낸 입맛 도전장':mode==='self'?'이번엔 내 진짜 입맛':'같이 먹은 짬바 테스트'}</span>
    <h1 ref={heading} tabIndex={-1}>{mode==='guess'?<>내 친구라면<br/><em>이건 맞히겠지?</em></>:mode==='self'?<>친구 말고,<br/><em>나라면 이 한 끼.</em></>:<>너, 내 입맛<br/><em>얼마나 알아?</em></>}</h1>
    <p>{mode==='guess'?'친구가 골랐을 음식을 맞혀봐요. 정답은 마지막에!':mode==='self'?'내 취향을 고르면 둘 다 선택한 메뉴가 나와요.':'사진 두 장 중 하나씩. 내 퀴즈를 친구에게 보내요.'}</p>
   </header>
   <div className={s.progress} aria-label={`전체 6문제 중 ${answers.length+1}번째`}>{tasteQuestions.map((_,i)=><span key={i} data-active={i<=answers.length}/>)}<b>{answers.length+1} / 6</b></div>
   <section className={s.question} aria-labelledby="taste-question"><span>{question.scene}</span><h2 id="taste-question">{mode==='guess'?question.prompt.replaceAll('내가','친구가').replace('내 입맛','친구 입맛').replace('내 선택','친구의 선택'):question.prompt}</h2>
    <div className={s.pair} key={`${mode}-${answers.length}`}>{question.foods.map((index,side)=><button className={s.foodChoice} key={index} onClick={()=>answer(side)} aria-label={`${tasteFoods[index].name} 선택`}><div className={s.choicePhoto}><FoodPhoto index={index}/></div><span className={s.choiceName}>{tasteFoods[index].name}</span><small>{tasteFoods[index].tag}</small></button>)}</div>
   </section>
   <footer className={s.footer}>{answers.length>0?<Button variant="ghost" onClick={()=>{setAnswers(answers.slice(0,-1));focusHeading();}}>이전 질문</Button>:<span>가입도 입력도 없이 · 6번만 고르면 끝</span>}</footer>
   <TasteHomeCta compact/><small className={s.imageNote}>음식 사진은 AI로 만든 예시예요.</small>
  </>:<>
   <header className={s.intro}><span className={s.eyebrow}>{quizDone?'친구 입맛 채점표':'내 입맛 도전장 완성'}</span><h1 ref={heading} tabIndex={-1}>{quizDone?<>{score}개 맞혔어요.<br/><em>{quizVerdict(score)}</em></>:<>내 입맛 퀴즈,<br/><em>누가 다 맞힐까?</em></>}</h1><p>{quizDone?'맞힌 개수는 친구의 선택을 얼마나 잘 예상했는지예요.':'밥을 자주 먹는 그 친구에게 보내 봐요.'}</p></header>
   <TasteHomeCta/>
   {mine!==null&&<section className={s.challenge}><span className={s.eyebrow}>친구에게 이렇게 보내요</span><p>“우리 그렇게 같이 먹었는데,<br/>6개 다 맞힐 수 있어?”</p><Button block size="lg" variant="secondary" onClick={share}>{quizDone?'이번엔 내 퀴즈 보내기':'친구에게 도전장 보내기'}</Button><small>링크에는 음식 선택만 담겨요. 이름과 계정은 필요 없어요.</small></section>}
   {quizDone&&mine===null&&<section className={s.challenge}><h2>그럼 우리는 입맛도 통할까?</h2><p>이번엔 내 취향을 고르고,<br/>둘 다 선택한 메뉴로 룰렛을 돌려요.</p><Button block size="lg" variant="secondary" onClick={startOwn}>내 취향 고르고 같이 먹을 메뉴 찾기</Button></section>}
   <Button variant="secondary" block disabled={exporting} onClick={exportCard}>{exporting?'이미지를 만들고 있어요…':quizDone?'채점표 이미지 저장·공유':'도전장 이미지 저장·공유'}</Button>
   {cardPreview&&<section className={s.cardPreview}><Image src={cardPreview} width={1080} height={1350} unoptimized alt={quizDone?'친구 입맛 퀴즈 채점표':'정답이 숨겨진 입맛 퀴즈 도전장'}/><LinkButton href={cardPreview} download="끼니플랜-입맛퀴즈.png" block>PNG 이미지 저장</LinkButton><Button block variant="secondary" onClick={shareImage}>이미지 공유하기</Button><small>인스타·쓰레드에 올릴 때 도전 링크도 함께 보내 주세요.</small></section>}
   <section className={s.scoreCard}><div className={s.resultTop}><b>{quizDone?'예상과 실제, 얼마나 달랐을까?':'내가 고른 여섯 끼'}</b><span>{quizDone?`${score} / 6`:'MY SIX PICKS'}</span></div>
    {tasteQuestions.map((q,i)=>{const actual=quizSelections(quizDone?target:mine!)[i],predicted=quizDone?quizSelections(guess)[i]:null,correct=predicted===actual;return <div className={s.answerRow} key={q.scene}><div className={s.answerPhoto}><FoodPhoto index={actual}/></div><div><small>{i+1}. {q.scene}</small><strong>{tasteFoods[actual].name}</strong>{predicted!==null&&<span>내 예상: {tasteFoods[predicted].name}</span>}</div>{quizDone&&<b className={s.answerBadge} data-correct={correct}>{correct?'정답':'엇갈림'}</b>}</div>;})}
   </section>
   {ownDone&&<>
    <section className={s.match}><span className={s.eyebrow}>그래서, 다음 한 끼는?</span><h2>{target===null?'내가 고른 메뉴로 한 끼 정해요':menus.length?`둘 다 선택한 메뉴 ${menus.length}개`:'이번엔 선택한 메뉴가 달랐어요'}</h2><p>{menus.length?menus.map(i=>tasteFoods[i].name).join(' · '):'공통 메뉴는 없어요. 서로의 선택을 보며 다음 한 끼를 이야기해 봐요.'}</p>{target!==null&&<small>나는 {quizMenuIndices(mine).map(i=>tasteFoods[i].name).join(' · ')} 선택</small>}</section>
    {menus.length>1&&<TasteRoulette key={`${target}-${mine}`} names={menus.map(i=>tasteFoods[i].name)} disabled={saving} onStart={()=>{setSpinning(true);setSaved(false);setNotice('');saveId.current=null;trackAnalytics('taste_roulette_started');}} onPick={index=>{setPick(index);setSpinning(false);}}/>}
    {chosen&&<section className={s.meal}><div className={s.mealImage}><FoodPhoto index={menus[pick%menus.length]}/></div><div><span className={s.eyebrow}>{menus.length===1?'공통 메뉴는 이 한 가지':'오늘의 한 끼'}</span><h2>{chosen.name}</h2><p>{chosen.tag}</p></div><Button block variant="secondary" disabled={saving||saved||spinning} onClick={save}>{saved?'오늘 저녁에 담았어요':saving?'담고 있어요…':'오늘 저녁으로 담기'}</Button></section>}
    {menus.length===0&&<LinkButton href="/" block>다른 식단 추천받기</LinkButton>}
    <Button variant="ghost" disabled={saving||spinning} onClick={resetOwn}>내 취향 다시 고르기</Button>
   </>}
   {notice&&<Notice>{notice}</Notice>}{login&&<LinkButton href="/profile">로그인하러 가기</LinkButton>}{saved&&<LinkButton href="/plan">내 식단 보기</LinkButton>}
   {shareLink&&<div className={s.challengeLink}><small>친구에게 보낼 도전 링크</small><a className={s.shareLink} href={shareLink}>{shareLink}</a></div>}
  </>}
 </main>;
}
