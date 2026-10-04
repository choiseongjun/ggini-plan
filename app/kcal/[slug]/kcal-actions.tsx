'use client';
import {LinkButton} from '../../components/ui';
import {trackAnalytics} from '../../../lib/analytics';

// 검색으로 들어온 사람이 앱으로 넘어오는 두 갈래: 방금 본 음식을 기록하거나, 다음에 먹을 걸 추천받거나.
export function KcalActions({code,name}:{code:string;name:string}){
 const track=()=>trackAnalytics('landing_cta_clicked',{source:'kcal'});
 return <div className="kcal-actions">
  <LinkButton variant="primary" size="lg" block href={`/record?log=${encodeURIComponent(code)}`} onClick={track}>{name} 먹었어요 · 기록하기</LinkButton>
  <LinkButton variant="secondary" block href="/?from=kcal" onClick={track}>오늘 남은 끼니 추천받기</LinkButton>
 </div>;
}
