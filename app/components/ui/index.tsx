// 끼니플랜 공통 UI. 사용 규칙은 docs/design-guide.md.
import Link from 'next/link';
import type {ButtonHTMLAttributes,ComponentProps,ReactNode} from 'react';
import {Icon,type IconName} from '../icons';
import styles from './ui.module.css';

type Variant='primary'|'secondary'|'ghost'|'danger';
type Size='sm'|'md'|'lg';
const cx=(...names:(string|false|undefined)[])=>names.filter(Boolean).join(' ');
const buttonClass=(variant:Variant,size:Size,block:boolean,className?:string)=>cx(styles.button,styles[variant],size!=='md'&&styles[size],block&&styles.block,className);

type ButtonStyle={variant?:Variant;size?:Size;block?:boolean};

/** 화면의 주 행동은 primary 하나. 되돌릴 수 없는 행동만 danger. */
export function Button({variant='primary',size='md',block=false,className,type='button',...props}:ButtonStyle&ButtonHTMLAttributes<HTMLButtonElement>){
 return <button type={type} className={buttonClass(variant,size,block,className)} {...props}/>;
}

/** 다른 화면으로 가는 버튼 모양 링크. */
export function LinkButton({variant='secondary',size='md',block=false,className,...props}:ButtonStyle&ComponentProps<typeof Link>){
 return <Link className={buttonClass(variant,size,block,className)} {...props}/>;
}

/** 닫기·삭제처럼 아이콘만 있는 버튼. label은 스크린리더용으로 필수. */
export function IconButton({icon,label,className,type='button',...props}:{icon:IconName;label:string}&Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'>){
 return <button type={type} className={cx(styles.iconButton,className)} aria-label={label} title={label} {...props}><Icon name={icon} size={16} strokeWidth={2.2}/></button>;
}

/** 하단 탭에 없는 화면의 뒤로 가기. 문구는 목적지 이름("식단으로"). */
export function BackButton({children,onClick,href}:{children:ReactNode;onClick?:()=>void;href?:string}){
 const content=<><Icon name="left" size={17}/>{children}</>;
 return href?<Link className={styles.back} href={href}>{content}</Link>:<button type="button" className={styles.back} onClick={onClick}>{content}</button>;
}

/** 내용 묶음. tone=soft는 안내·보조, danger는 위험 영역. */
export function Card({tone='default',className,...props}:{tone?:'default'|'soft'|'danger'}&ComponentProps<'section'>){
 return <section className={cx(styles.card,tone==='soft'&&styles.soft,tone==='danger'&&styles.dangerCard,className)} {...props}/>;
}

/** 페이지 맨 위 제목. title 안의 <em>은 강조색. */
export function PageHeader({kicker,icon,title,description}:{kicker?:string;icon?:IconName;title:ReactNode;description?:ReactNode}){
 return <header className={styles.pageHeader}>{kicker&&<span className={styles.kicker}>{icon&&<Icon name={icon} size={15}/>}{kicker}</span>}<h2 className={styles.title}>{title}</h2>{description&&<p className={styles.description}>{description}</p>}</header>;
}

/** 상태 안내. error는 role=alert, 나머지는 role=status. action에는 "다시 시도" 같은 버튼. */
export function Notice({tone='info',children,action}:{tone?:'info'|'success'|'warning'|'error';children:ReactNode;action?:ReactNode}){
 return <div className={cx(styles.notice,styles[tone])} role={tone==='error'?'alert':'status'}><div>{children}</div>{action}</div>;
}
