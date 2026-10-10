'use client';

import {useEffect, useState} from 'react';
import {detailedFoodCode, nutritionAmount, nutritionScale, nutrientText, type DetailedNutritionData} from '../lib/detailed-nutrition';
import styles from './detailed-nutrition.module.css';

type Props = {code: string; amount?: number; unit?: string; historical?: boolean; referenceOnly?: boolean};
export function DetailedNutrition(props: Props) {
 const code = detailedFoodCode(props.code);
 return code ? <NutritionPanel key={code} {...props} code={code}/> : null;
}

function NutritionPanel({code, amount, unit, historical, referenceOnly}: Props) {
 const [open, setOpen] = useState(false);
 const [result, setResult] = useState<{item: DetailedNutritionData | null} | null>(null);
 const [error, setError] = useState(false);
 const [attempt, setAttempt] = useState(0);
 useEffect(() => {
  if (!open || result) return;
  const controller = new AbortController();
  fetch(`/api/food-reference/nutrients?code=${encodeURIComponent(code)}`, {signal: controller.signal})
   .then(async response => {if (!response.ok) throw Error(); return response.json();})
   .then(data => {if (!controller.signal.aborted) {setResult(data); setError(false);}})
   .catch(() => {if (!controller.signal.aborted) setError(true);});
  return () => controller.abort();
 }, [open, code, result, attempt]);
 const item = result?.item;
 const requested = amount !== undefined && unit ? nutritionAmount(`${amount}${unit}`) : null;
 const scale = item ? nutritionScale(item.basis, requested) : null;
 const factor = scale ?? 1;
 const groups = [...new Set(item?.nutrients.map(n => n.group) ?? [])];
 return <details className={styles.panel} onToggle={event => setOpen(event.currentTarget.open)}>
  <summary>상세 영양성분 모두 보기</summary>
  {open && <div className={styles.body}>
   {!result && !error && <p role="status">상세 영양성분을 불러오는 중…</p>}
   {error && <p role="alert">상세 영양성분을 불러오지 못했어요. <button type="button" onClick={() => {setError(false); setAttempt(n => n + 1);}}>다시 시도</button></p>}
   {result && !item && <p>이 음식에 연결된 상세 영양자료가 아직 없어요.</p>}
   {item && <>
    <p className={styles.basis}><strong>{scale !== null && requested ? `${requested.value.toLocaleString('ko-KR')} ${requested.unit} 기준` : `원본 ${item.basisText} 기준`}</strong><span>{item.name} · {item.nutrients.length}개 성분</span></p>
    {amount !== undefined && scale === null && <p>선택한 양으로 환산할 수 없어 원본 기준량을 표시해요.</p>}
    {historical && <p>최신 원본의 참고값이에요. 기록 당시 영양값이나 먹은 양과 다를 수 있어요.</p>}
    {referenceOnly && <p>참고 음식의 원본 영양성분이에요. 추천 레시피의 재료·밥·반찬을 합산한 값은 아니에요.</p>}
    {!item.nutrients.length && <p>원본에 제공된 영양성분 값이 없어요.</p>}
    {groups.map(group => <section key={group} className={styles.group} aria-label={group}>
     <h4>{group}</h4><dl>{item.nutrients.filter(n => n.group === group).map(n => <div key={n.key}>
      <dt>{n.name}</dt><dd>{nutrientText(n, factor)} <span>{n.unit}</span>{n.value === null && factor !== 1 && <small>원본 표기 · 환산 제외</small>}</dd>
     </div>)}</dl>
    </section>)}
    <p className={styles.note}>원본에 값이 있는 성분만 표시해요. 미제공은 0이 아니에요. 기존 요약 영양값과 출처·기준일에 따라 차이가 날 수 있어요.</p>
    <p className={styles.note}>출처: <a href="https://various.foodsafetykorea.go.kr/nutrient/general/site/Info.do" target="_blank" rel="noopener noreferrer">식품영양성분 데이터베이스<br/>Korean Food Composition Database system(K-FCDB)</a><br/>자료 제공: {item.source}{item.sourceDate && ` · 기준일 ${item.sourceDate}`}<br/>{item.fileName} · 원본 {item.basisText}</p>
   </>}
  </div>}
 </details>;
}
