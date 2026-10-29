'use client';
import {useState} from 'react';
import Link from 'next/link';
import {comparisonUnit,foodComparisonGroup,nutrientPer100,rankComparison,type ComparisonFood,type FoodMetric} from '../../../lib/food-comparison';
import type {FoodReference} from '../../../lib/food-reference';
import {trackAnalytics} from '../../../lib/analytics';
const metrics={sugar:'당류 적은 순',kcal:'열량 낮은 순',protein:'단백질 많은 순',sodium:'나트륨 적은 순'};
const value=(n:number|null,unit:string)=>n===null?'미확인':`${Math.round(n*10)/10}${unit}`;
export function FoodComparison({food,items}:{food:FoodReference;items:ComparisonFood[]}){
 const [metric,setMetric]=useState<FoodMetric>('sugar'),[basis,setBasis]=useState<'100'|'serving'>('100'),[opened,setOpened]=useState(false);
 const [sameBrand,setSameBrand]=useState(Boolean(food.brand));
 const candidates=sameBrand?items.filter(item=>item.food.brand===food.brand):items;
 const choices=rankComparison(candidates,metric).slice(0,5);
 const read=(f:FoodReference,m:FoodMetric)=>basis==='100'?nutrientPer100(f,m):f[m];
 if(!foodComparisonGroup(food.name)||!comparisonUnit(food.servingUnit))return <section className="kcal-box"><h2>비교할 음식을 더 확인하고 있어요</h2><p>종류와 기준 단위가 맞는 음식만 비교해요. 이 음식은 아직 자동 비교를 지원하지 않아요.</p><Link href="/kcal">다른 음식 찾아보기</Link></section>;
 return <section className="kcal-box food-comparison" id="compare-foods"><h2>먹기 전에, 다른 메뉴와 비교해 볼까요?</h2><p>같은 종류의 {foodComparisonGroup(food.name)??'음식'}를 비교해요. 숫자가 낮다고 무조건 더 건강한 음식은 아니에요.</p>
 <button type="button" className="food-choice-button" aria-expanded={opened} onClick={()=>{if(!opened)trackAnalytics('food_compare_opened',{source:'kcal'});setOpened(!opened);}}>{opened?'비교 접기':'비슷한 메뉴 비교하기'}</button>
 {opened&&<><div className="food-compare-controls"><label>비교 기준<select value={metric} onChange={e=>{setMetric(e.target.value as FoodMetric);trackAnalytics('food_compare_changed',{source:'kcal'});}}>{Object.entries(metrics).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>{food.brand&&<label><input type="checkbox" checked={sameBrand} onChange={e=>setSameBrand(e.target.checked)}/>{food.brand} 안에서 비교</label>}<label>표시량<select value={basis} onChange={e=>setBasis(e.target.value as '100'|'serving')}><option value="100">동일한 100{comparisonUnit(food.servingUnit)} 기준</option><option value="serving">각 제품의 표시 기준량</option></select></label></div>
 <p className="kcal-note">정렬은 항상 100{comparisonUnit(food.servingUnit)} 기준이에요. 각 제품의 기준량은 한 컵·한 조각과 다를 수 있어요. 아래 값은 개인별 건강 등급이 아니에요.</p>
 <div className="food-compare-table" tabIndex={0} role="region" aria-label="메뉴별 영양 비교 표"><table><caption>{basis==='100'?`100${comparisonUnit(food.servingUnit)}당 영양 비교`:'각 제품에 표시된 기준량의 영양값'}</caption><thead><tr><th>메뉴</th><th>표시량</th><th>열량</th><th>당류</th><th>단백질</th><th>나트륨</th></tr></thead><tbody>{[{food,slug:''},...choices].map((item,i)=><tr key={item.food.code} className={i===0?'is-current':undefined}><th scope="row">{i===0?<span>지금 보는 메뉴<br/>{food.name}</span>:<Link onClick={()=>trackAnalytics('food_compare_selected',{source:'kcal'})} href={`/kcal/${encodeURIComponent(item.slug)}`}>{item.food.brand} {item.food.name}</Link>}</th><td>{basis==='100'?`100${comparisonUnit(food.servingUnit)}`:`${item.food.servingAmount}${item.food.servingUnit}`}</td><td>{value(read(item.food,'kcal'),'kcal')}</td><td>{value(read(item.food,'sugar'),'g')}</td><td>{value(read(item.food,'protein'),'g')}</td><td>{value(read(item.food,'sodium'),'mg')}</td></tr>)}</tbody></table></div>
 {!choices.length&&<p>같은 조건으로 비교할 메뉴가 아직 없어요.{sameBrand?' 브랜드 제한을 풀어 다른 브랜드도 확인해 보세요.':''}</p>}<p className="kcal-note">조건에 맞는 후보 {candidates.length}개 중 최대 5개 표시 · 전체 시장 순위가 아니에요. 출처·기준일과 옵션은 각 메뉴 상세에서 확인하세요.</p></>}
 </section>;
}
