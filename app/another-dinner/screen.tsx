'use client';

import {useRef,useState} from 'react';
import Link from 'next/link';
import {Button,LinkButton,Notice} from '../components/ui';
import {RiceBuddy} from '../rice-buddy';
import styles from './style.module.css';

const options=[
 {id:'home',label:'집에서',name:'달걀 두부 덮밥',price:3500,time:'15분',tag:'냉장고부터 열어볼까요?',description:'두부와 달걀을 익혀 밥 위에 올리면 끝. 오늘은 간단하게 직접 챙겨요.',items:'밥 · 두부 · 달걀 · 간장',href:'/'},
 {id:'convenience',label:'편의점',name:'주먹밥 + 달걀 + 두유',price:6500,time:'5분',tag:'조리 없이 가볍게',description:'주먹밥에 달걀과 두유를 더해요. 바쁜 날에도 한 가지로 끝내지 않아요.',items:'주먹밥 · 구운 달걀 · 무가당 두유',href:'/convenience'},
 {id:'eat-out',label:'밖에서',name:'동네 비빔밥 한 그릇',price:9000,time:'20분',tag:'설거지는 내일의 나에게도 없어요',description:'오늘은 식당에서 한 끼. 주변 메뉴와 가격을 확인하고 골라요.',items:'비빔밥 한 그릇',href:'/eat-out'},
];
const goals=[{id:'save',label:'식비 아끼기'},{id:'full',label:'든든하게 먹기'},{id:'easy',label:'고민 줄이기'}];
const won=(n:number)=>`${n.toLocaleString('ko-KR')}원`;

export default function DinnerExperience(){
 const [meal,setMeal]=useState('');const [price,setPrice]=useState('');const [goal,setGoal]=useState('save');
 const [step,setStep]=useState<'input'|'choices'|'receipt'>('input');const [selected,setSelected]=useState(options[0]);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const resultRef=useRef<HTMLElement>(null);
 const amount=Number(price);const difference=amount-selected.price;
 const ordered=goal==='easy'?[options[1],options[0],options[2]]:goal==='full'?[options[0],options[2],options[1]]:options;
 function move(next:'input'|'choices'|'receipt'){setStep(next);setNotice('');requestAnimationFrame(()=>resultRef.current?.focus());}
 function submit(e:React.FormEvent){e.preventDefault();if(!meal.trim()||!price||!Number.isFinite(amount)||amount<0||amount>1000000){setError('먹은 메뉴와 0~1,000,000원 사이의 금액을 적어 주세요.');return;}setError('');move('choices');}
 async function share(){const url=`${window.location.origin}/another-dinner`;const text=`내 저녁의 다른 결말: ${selected.name}. 당신의 한 끼도 바꿔볼까요?`;
  try{if(navigator.share)await navigator.share({title:'당신이 먹지 않은 저녁',text,url});else{await navigator.clipboard.writeText(`${text}\n${url}`);setNotice('공유할 문구와 링크를 복사했어요.');}}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setNotice('공유가 안 됐어요. 주소창의 링크를 복사해 주세요.');}
 }
 const nextHref=`${selected.href}?dinner=${encodeURIComponent(selected.name)}`;
 return <main className={styles.page}>
  <nav className={styles.nav}><Link href="/" className={styles.brand}>끼니플랜<span>작은 식사 실험실</span></Link><span>가입 없이 해봐요</span></nav>
  <section className={styles.hero}><div className={styles.buddy}><RiceBuddy stage={1}/></div><p className={styles.kicker}>한 끼에 다른 결말을</p><h1>당신이 먹지 않은<br/><em>저녁.</em></h1><p>어제의 한 끼를 알려주세요.<br/>오늘의 나는 다르게 먹을 수도 있으니까요.</p></section>
  <div className={styles.progress} aria-label={`3단계 중 ${step==='input'?1:step==='choices'?2:3}단계`}><span className={styles.active}>01 어제의 나</span><span className={step!=='input'?styles.active:''}>02 다른 선택</span><span className={step==='receipt'?styles.active:''}>03 오늘의 나</span></div>
  <section ref={resultRef} tabIndex={-1} className={styles.content}>
   {step==='input'?<form onSubmit={submit} className={styles.card}>
    <span className={styles.kicker}>어제의 나에게 물어보기</span><h2>최근 한 끼, 뭐 먹었어요?</h2><p className={styles.muted}>어제가 아니어도 괜찮아요. 기억나는 한 끼면 돼요.</p>
    <label className={styles.field}>먹은 메뉴<input value={meal} maxLength={60} onChange={e=>setMeal(e.target.value)} placeholder="예: 배달 제육덮밥" required/></label>
    <div className={styles.chips}>{['배달 제육덮밥','편의점 컵라면','밖에서 먹은 비빔밥'].map(name=><button key={name} type="button" onClick={()=>setMeal(name)}>{name}</button>)}</div>
    <label className={styles.field}>얼마 썼어요?<div className={styles.priceInput}><input type="number" inputMode="numeric" min="0" max="1000000" step="1" value={price} onChange={e=>setPrice(e.target.value)} placeholder="13000" required/><span>원</span></div></label>
    <fieldset className={styles.goals}><legend>오늘은 어떤 한 끼가 좋아요?</legend>{goals.map(g=><button key={g.id} type="button" aria-pressed={goal===g.id} onClick={()=>setGoal(g.id)} className={goal===g.id?styles.chosen:''}>{g.label}</button>)}</fieldset>
    {error&&<Notice tone="error">{error}</Notice>}<Button type="submit" size="lg" block>내 저녁의 다른 결말 보기</Button><p className={styles.note}>입력한 식사와 금액은 이 체험에서만 사용해요.</p>
   </form>:step==='choices'?<div className={styles.card}>
    <span className={styles.kicker}>오늘은 바꿀 수 있어요</span><h2>같은 배고픔,<br/>다른 선택 세 가지.</h2><p className={styles.muted}>최근 한 끼: {meal} · {won(amount)}</p>
    <p className={styles.note}>개인 맞춤 분석 전의 예시예요. {goals.find(g=>g.id===goal)?.label}에 맞춰 살펴보세요.</p>
    <div className={styles.options}>{ordered.map(o=><button key={o.id} className={styles.option} onClick={()=>{setSelected(o);move('receipt');}}><span className={styles.optionTop}><span>{o.label} · 약 {o.time}</span><strong>{won(o.price)} 예상</strong></span><h3>{o.name}</h3><p>{o.description}</p><span className={styles.pick}>이 결말 고르기 →</span></button>)}</div>
    <Button variant="ghost" block onClick={()=>move('input')}>입력 다시 하기</Button>
   </div>:<div className={styles.result}>
    <header><span className={styles.kicker}>오늘의 나에게 보내는</span><h2>평행세계 영수증</h2><p>{selected.tag}</p></header>
    <div className={styles.receipt}><span className={styles.receiptBrand}>KKINI PLAN / ANOTHER DINNER</span><h3>내 저녁의 다른 결말</h3><div className={styles.line}><span>내가 입력한 한 끼</span><strong>{won(amount)}</strong></div><p className={styles.muted}>{meal}</p><hr/><div className={styles.line}><span>다른 선택 · 예상 비용</span><strong>{won(selected.price)}</strong></div><h3>{selected.name}</h3><p>{selected.items}</p><hr/><span className={styles.kicker}>한 끼 비용 차이 · 예상</span><strong className={styles.amount}>{difference>0?`${won(difference)} 적게`:difference<0?`${won(-difference)} 더`:'같은 비용'}</strong><p className={styles.note}>예시 가격과 비교한 금액이에요. 실제 절약액이 아니며, 매장·구매 단위에 따라 달라져요.</p><div className={styles.barcode} aria-hidden="true"/><span className={styles.receiptBrand}>오늘의 선택은 아직 바꿀 수 있어요</span></div>
    <LinkButton href={nextHref} variant="primary" block size="lg">이 선택으로 오늘 식단 추천받기</LinkButton><Button variant="secondary" block onClick={share}>내 저녁의 다른 결말 공유하기</Button>{notice&&<Notice>{notice}</Notice>}<Button variant="ghost" block onClick={()=>move('choices')}>다른 결말 보기</Button>
   </div>}
  </section><footer className={styles.footer}>끼니플랜 · 매일 한 끼, 나를 조금 더 챙기는 선택</footer>
 </main>;
}
