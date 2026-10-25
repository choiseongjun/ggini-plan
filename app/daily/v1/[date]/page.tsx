import Link from 'next/link';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {AppShell,Brand} from '../../../app-shell';
import {DailyMenuHome} from '../../../daily-menu-home';
import {dailyMenus,validEdition} from '../../../../lib/daily-menu';
type Props={params:Promise<{date:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {date}=await params;
 if(!validEdition(date))return {title:'메뉴판을 찾지 못했어요'};
 const description=dailyMenus(date).map(menu=>menu.name).join(' · ');
 return {title:`${date} 끼니 3선 | 끼니플랜`,description,alternates:{canonical:`/daily/v1/${date}`},openGraph:{title:'셋 중 뭐 먹을래?',description},robots:{index:false,follow:true}};
}
export default async function DailyEdition({params}:Props){
 const {date}=await params;if(!validEdition(date))notFound();
 return <AppShell><header className="app-header"><Brand/><Link href="/">오늘 메뉴 →</Link></header><div className="app-content"><DailyMenuHome edition={date}/></div></AppShell>;
}
