'use client';
import {LinkButton} from '../components/ui';
import {trackAnalytics} from '../../lib/analytics';
import s from './taste.module.css';
export default function TasteHomeCta({compact=false}:{compact?:boolean}){
 const link=<LinkButton href="/?from=taste#today-meals" variant={compact?'secondary':'primary'} block size={compact?'md':'lg'} onClick={()=>trackAnalytics(compact?'taste_home_midquiz_clicked':'taste_home_result_clicked')}>오늘 식단 추천받기</LinkButton>;
 return compact?<div>{link}</div>:<section className={s.challenge}><span className={s.eyebrow}>입맛은 알아봤으니, 이제 오늘 한 끼</span><h2>그래서 오늘 뭐 먹지?</h2><p>끼니플랜 홈에서 오늘 먹을 메뉴를 추천받고,<br/>마음에 들면 내 식단에 담아 봐요.</p>{link}</section>;
}
