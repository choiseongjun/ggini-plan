import Link from 'next/link';
import {OfficialMealNutritionPanel} from './official-meal-nutrition';
import {DetailedNutrition} from './detailed-nutrition';
import {nutritionReferenceSource,type DailyNutritionReference} from '../lib/daily-nutrition-reference';
import type {PlanProduct} from '../lib/shopping-plan';
import {nutritionIsEstimated,servingNutrients} from '../lib/serving-nutrients';
import './recommendation-nutrition.css';

const fields=[['calories','열량','kcal'],['protein','단백질','g'],['carbs','탄수화물','g'],['fat','지방','g'],['sodium','나트륨','mg']] as const;
const format=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});

export function ProductNutrition({product}:{product:PlanProduct}){
 const n=servingNutrients(product);
 return <div className="recommendation-nutrition"><small>{product.officialNutrition?'K-FCDB 기준량 환산 영양정보':`1회분 영양정보${nutritionIsEstimated(product)?' · AI 추정 포함':product.recipe?' · 재료 합산 예상':''}`}</small>{product.officialNutrition&&<p>{product.servingNote}</p>}<dl>{fields.map(([key,label,unit])=><div key={key}><dt>{label}</dt><dd>{n[key]===null?'미확인':`${format(n[key])} ${unit}`}</dd></div>)}</dl>{product.officialNutrition?<OfficialMealNutritionPanel meal={product.officialNutrition}/>:product.id.startsWith('recipe-opt-')&&<DetailedNutrition code={product.id.slice('recipe-opt-'.length)} referenceOnly/>}</div>;
}

export function DailyRecommendationNutrition({products,reference}:{products:PlanProduct[];reference:DailyNutritionReference}){
 const values=products.map(servingNutrients);
 const range=(values:number[])=>`${format(values[0])}–${format(values[1])} g`;
 const references=reference?{calories:`약 ${format(reference.calories)} kcal`,protein:`${reference.protein} g (권장)`,carbs:range(reference.carbs),fat:range(reference.fat),sodium:`${format(reference.sodiumAdequate)} mg (충분) · ${format(reference.sodiumReduction)} mg 초과 시 줄이기`}: {calories:'내 정보 확인 필요',protein:'내 정보 확인 필요',carbs:'내 정보 확인 필요',fat:'내 정보 확인 필요',sodium:'내 정보 확인 필요'};
 // Collapsed by default so a fresh recommendation leads with the menus; the one-line summary stays visible.
 const total=(key:'calories'|'protein',unit:string)=>{const known=values.flatMap(n=>n[key]===null?[]:[n[key]]);return known.length?`${format(known.reduce((a,b)=>a+b,0))} ${unit}${known.length<values.length?' (부분 합계)':''}`:'미확인';};
 return <details className="daily-recommendation-nutrition">
  <summary><span><strong>이날 영양 합계</strong><small>약 {total('calories','kcal')} · 단백질 {total('protein','g')}{reference?` · 하루 참고 ${format(reference.calories)} kcal`:''}</small></span><i aria-hidden="true"/></summary>
  {reference&&<p><strong>{reference.label}</strong></p>}
  <p>선택한 {products.length}끼의 예상 합계예요. 실제 먹은 양이나 다른 식사·간식은 포함하지 않아요.{products.some(nutritionIsEstimated)&&' AI 추정 영양값이 포함돼요. 추가 양념·기름은 포함하지 않아요.'}</p>
  <table><thead><tr><th scope="col">영양소</th><th scope="col">식단 합계</th><th scope="col">하루 참고량</th></tr></thead><tbody>{fields.map(([key,label,unit])=>{
   const known=values.flatMap(n=>n[key]===null?[]:[n[key]]);
   const missing=values.length-known.length;
   return <tr key={key}><th scope="row">{label}</th><td>{known.length?`${format(known.reduce((sum,n)=>sum+n,0))} ${unit}`:'미확인'}{missing>0&&<small>{known.length?'부분 합계 · ':''}미확인 {missing}끼</small>}</td><td>{references[key]}</td></tr>;
  })}</tbody></table>
  {products.length>0&&products.every(p=>p.officialNutrition)&&<OfficialMealNutritionPanel meal={{parts:products.flatMap(p=>p.officialNutrition!.parts)}}/>}
  {!reference&&<p>개인별 참고량을 계산할 신체 정보가 없거나 자동 계산 대상이 아니에요. <Link href="/profile#profile-settings">내 정보 확인 →</Link></p>}
  <details><summary>하루 참고량은 어떻게 계산하나요?</summary><p>2025 한국인 영양소 섭취기준의 성별·연령별 단백질 권장섭취량과 나트륨 기준을 적용해요. 열량은 나이·성별·키·체중·활동량으로 계산한 유지 필요량 추정치이며, 탄수화물 50–65%, 지방 15–30%를 그램으로 환산해요.</p><p>나트륨의 충분섭취량은 반드시 채워야 할 목표가 아니에요. 만성질환위험감소섭취량을 넘게 먹고 있다면 줄이는 기준이며, 안전한 상한을 뜻하지 않아요. 현재 자동 계산은 만 19–78세를 지원하며, 임신·수유로 등록한 경우 제공하지 않아요. 운동·질환에 따른 개인별 목표와는 다를 수 있어요.</p><p>위 표는 주요 5개 성분을 비교해요. 공식 자료가 연결된 식단은 전체 영양성분을 펼쳐 식이섬유·비타민 등의 합계와 음식별 원본도 확인할 수 있어요.</p><a href={nutritionReferenceSource} target="_blank" rel="noopener noreferrer">2025 한국인 영양소 섭취기준 원문 ↗</a></details>
 </details>;
}
