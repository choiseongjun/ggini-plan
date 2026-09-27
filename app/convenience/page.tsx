import Link from 'next/link';
import {HomeMealChoice} from '../home-meal-choice';
export const metadata={title:'편의점 한 끼 | 끼니플랜',robots:{index:false,follow:false}};
export default function ConveniencePage(){return <main style={{maxWidth:720,margin:'0 auto',padding:'24px 20px 80px'}}><Link href="/">← 홈으로</Link><HomeMealChoice initialOpen/></main>;}
