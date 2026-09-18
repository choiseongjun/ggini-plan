import type {Metadata} from 'next';
import {socialImage} from '../../../lib/seo';
import {SharedPlanView} from './shared-plan-view';
export const metadata:Metadata={title:'같이 먹어요 · 공유 식단 | 끼니플랜',description:'일차별 메뉴와 예상 식비를 확인하고 내 예산으로 시작해 보세요.',robots:{index:false,follow:false},twitter:{card:'summary_large_image',title:'같이 먹어요 · 끼니플랜',description:'일차별 메뉴와 예상 식비를 확인해 보세요.',images:[socialImage()]},openGraph:{images:[socialImage()],title:'같이 먹어요 · 끼니플랜',description:'일차별 메뉴와 예상 식비를 확인해 보세요.'}};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;return <SharedPlanView id={id}/>;
}
