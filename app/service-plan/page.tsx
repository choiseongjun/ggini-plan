import type {Metadata} from 'next';
import Link from 'next/link';
import {Icon} from '../components/icons';
import sections from './content.json';
import styles from './plan.module.css';
import {UxOverview,UserJourney,ScreenMap,UserFlows,Wireframes} from './ux-diagrams';

export const metadata:Metadata={
  title:'끼니플랜 서비스 기획서',
  description:'끼니플랜의 서비스 정의, 메뉴 가지치기 구조, 화면별 기획과 사용자 흐름을 한 페이지에서 확인해요.',
  alternates:{canonical:'/service-plan',languages:{}},
  robots:{index:false,follow:false},
};

type Block={type:string;text?:string;small?:boolean;headers?:string[];rows?:string[][]};
const branches=[
  {name:'오늘',icon:'home',description:'지금 먹을 메뉴를 선택해요',items:['집에서 먹기','외식 메뉴','편의점 한 끼']},
  {name:'식단',icon:'calendar',description:'앞으로 먹을 계획을 만들어요',items:['미리 짜기','식단 달력','주간 가이드']},
  {name:'장보기',icon:'bag',description:'살 것과 가진 것을 확인해요',items:['살 재료','상품 찾기','내 재료']},
  {name:'기록',icon:'edit',description:'실제 먹은 한 끼를 남겨요',items:['식사 일기','하루 영양','식비와 생활']},
  {name:'마이',icon:'user',description:'내 정보와 습관을 관리해요',items:['내 정보와 목표','알림과 예산','피드백과 끼니']},
] as const;

function RichText({text}:{text:string}){
  return text.split(/(<b>.*?<\/b>)/g).map((part,index)=>part.startsWith('<b>')?<strong key={index}>{part.slice(3,-4)}</strong>:part);
}

function Contents(){
  return <nav aria-label="기획서 목차"><ol className={styles.contents}>
    {sections.map(section=><li key={section.id}><a href={`#${section.id}`}><span>{String(section.number).padStart(2,'0')}</span>{section.number===1?'서비스 개요':section.title}</a></li>)}
  </ol></nav>;
}

function StructureTree(){
  return <figure className={styles.tree}>
    <div className={styles.treeRoot}>끼니플랜</div>
    <ul className={styles.branches}>{branches.map(branch=><li key={branch.name}>
      <div className={styles.branchTitle}><Icon name={branch.icon}/><strong>{branch.name}</strong></div>
      <p>{branch.description}</p>
      <ul>{branch.items.map(item=><li key={item}>{item}</li>)}</ul>
    </li>)}</ul>
    <figcaption>1단계는 목적, 2단계는 하려는 일, 3단계는 화면 안의 상세 기능으로 구분해요.</figcaption>
  </figure>;
}

function ContentBlock({block}:{block:Block}){
  switch(block.type){
    case 'h':return <h3><RichText text={block.text??''}/></h3>;
    case 'bullet':return <p className={styles.bullet}><RichText text={block.text??''}/></p>;
    case 'table':return <div className={styles.tableWrap}><table>
      <caption className={styles.srOnly}>{block.headers?.join(' · ')}</caption>
      <thead><tr>{block.headers?.map(header=><th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{block.rows?.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,column)=><td key={column} data-label={block.headers?.[column]}>{cell}</td>)}</tr>)}</tbody>
    </table></div>;
    case 'tree':return <StructureTree/>;
    default:return <p className={block.small?styles.note:undefined}><RichText text={block.text??''}/></p>;
  }
}

export default function ServicePlanPage(){
  return <main className={styles.page} id="top">
    <a className={styles.skipLink} href="#document">기획서 본문으로</a>
    <header className={styles.header}>
      <Link className={styles.brand} href="/">끼니플랜<span>서비스 기획서</span></Link>
      <Link className={styles.homeLink} href="/">서비스 보기<Icon name="arrow" size={17}/></Link>
    </header>
    <div className={styles.hero}>
      <p className={styles.kicker}>서비스 구조와 화면 개편</p>
      <h1>끼니플랜 서비스 기획서</h1>
      <p className={styles.heroDescription}>메뉴 선택부터 장보기와 식사 일기까지.<br/>사용자가 하려는 일을 중심으로 서비스의 가지를 정리했어요.</p>
      <div className={styles.meta}><time dateTime="2026-10-06">2026년 10월 6일</time><span>버전 1.1</span><span>한국 서비스 중심</span></div>
      <div className={styles.actions}><a href="#document">기획서 읽기<Icon name="arrow" size={17}/></a><a href="#section-3">전체 구조도 바로 보기<Icon name="arrow" size={17}/></a></div>
      <UxOverview/>
    </div>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><p>목차</p><Contents/></aside>
      <details className={styles.mobileContents}><summary>목차에서 필요한 내용 찾기</summary><Contents/></details>
      <article className={styles.document} id="document" aria-label="서비스 기획서 본문">
        {sections.map(section=><section key={section.id} id={section.id} className={styles.chapter}>
          <div className={styles.chapterHeading}><span>{String(section.number).padStart(2,'0')}</span><h2>{section.number===1?'서비스 개요':section.title}</h2></div>
          <p className={styles.intro}>{section.intro}</p>
          {section.number===2&&<UserJourney/>}
          {section.number===3&&<><StructureTree/><ScreenMap/></>}
          {section.number===4&&<Wireframes/>}
          {section.number===7&&<UserFlows/>}
          <details className={styles.explanation} open={![2,3,4,7].includes(section.number)}><summary>상세 기획과 기준 읽기</summary>{section.blocks.filter(block=>block.type!=='tree'&&!(section.number===1&&'text' in block&&block.text?.startsWith('작성일'))).map((block,index)=><ContentBlock key={index} block={block as Block}/>)}</details>
        </section>)}
      </article>
    </div>
    <footer className={styles.footer}><p>끼니플랜 · 서비스 기획서 · 2026.10.06</p><a href="#top">맨 위로<Icon name="arrow" size={17}/></a></footer>
  </main>;
}
