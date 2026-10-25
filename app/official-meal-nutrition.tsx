import {officialMealNutrients,type OfficialMealNutrition} from '../lib/official-meal-nutrition';
import {DetailedNutrition} from './detailed-nutrition';
import styles from './detailed-nutrition.module.css';

export function OfficialMealNutritionPanel({meal}:{meal:OfficialMealNutrition}){
 const nutrients=officialMealNutrients(meal);
 const groups=[...new Set(nutrients.map(n=>n.group))];
 return <details className={styles.panel}>
  <summary>K-FCDB 전체 영양성분 · {nutrients.length}개 항목</summary>
  <div className={styles.body}>
   <p>아래 음식별 분량을 합산한 참고값이에요. 안내된 조리 재료를 분석한 값은 아니며 실제 조리법에 따라 달라져요.</p>
   {meal.parts.map((part,i)=><section key={`${part.code}-${i}`} className={styles.group}>
    <h4>{part.name} · {part.amount?`${part.amount.value} ${part.amount.unit}`:'분량 미확인'}</h4>
    {part.reference?<><p>{part.code} · {part.reference.source} · {part.reference.sourceDate}</p><DetailedNutrition code={part.code} amount={part.amount?.value} unit={part.amount?.unit}/></>:<p>연결된 공식 원본이 없어 합산하지 않았어요.</p>}
   </section>)}
   {groups.map(group=><section className={styles.group} key={group}><h4>{group}</h4><dl>{nutrients.filter(n=>n.group===group).map(n=><div key={n.key}><dt>{n.name}</dt><dd>{n.value===null?'미확인':n.value.toLocaleString('ko-KR',{maximumSignificantDigits:7})} {n.unit}{n.known<n.total&&<small>{n.known?`부분 합계 · ${n.known}/${n.total}개 음식 확인`:'수치 합산 불가 · 음식별 원본 참고'}</small>}</dd></div>)}</dl></section>)}
   <p className={styles.note}>미제공 성분은 0으로 채우지 않아요. 일부 음식에만 값이 있으면 부분 합계로 표시하며, 문자로 제공된 수치는 음식별 원본에서 확인할 수 있어요.</p>
   <p className={styles.note}>출처: <a href="https://various.foodsafetykorea.go.kr/nutrient/general/site/Info.do" target="_blank" rel="noopener noreferrer">식품영양성분 데이터베이스<br/>Korean Food Composition Database system(K-FCDB)</a></p>
  </div>
 </details>;
}
