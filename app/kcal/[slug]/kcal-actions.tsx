'use client';
import {LinkButton} from '../../components/ui';
import {trackAnalytics} from '../../../lib/analytics';

// Keep the selected food and allowlisted source through recording and login.
export function KcalActions({code,name}:{code:string;name:string}){
 const track=()=>trackAnalytics('landing_cta_clicked',{source:'kcal'});
 return <div className="kcal-actions">
  <LinkButton variant="primary" size="lg" block href={`/record?log=${encodeURIComponent(code)}&from=kcal`} onClick={track}>{name} 먹었어요 · 기록하기</LinkButton>
  <LinkButton variant="secondary" block href="/record?from=kcal" onClick={track}>다른 음식도 함께 기록하기</LinkButton>
 </div>;
}
