import type {CatalogItem} from './catalog';
export const comparisonSorts={name:'상품명순',price:'판매가 낮은 순',protein:'100g당 단백질 높은 순',calories:'100g당 열량 낮은 순'} as const;
export type ComparisonSort=keyof typeof comparisonSorts;
export function comparableNutrition(p:CatalogItem){
 const basis=p.nutritionBasis?.trim()??'';
 // Generic food reference values are not measured product labels. Multiple bases are ambiguous.
 const amounts=[...basis.matchAll(/(?<![\d.,-])(\d+(?:,\d{3})*(?:\.\d+)?)\s*(g|ml)(?![a-z])/gi)];
 const match=amounts.length===1?amounts[0]:null;
 const basisAmount=match?Number(match[1].replaceAll(',','')):0;
 const sourced=Boolean(p.nutritionSourceUrl||p.nutritionPhotoUrl);
 const valid=sourced&&match&&basisAmount>0&&!/참고값|실측 아님|조리 후|조리 전|가식부|일반 식품/.test(basis);
 const unit=valid?(match[2].toLowerCase()==='g'?'g':'mL'):null;
 const normalize=(n:number|null)=>valid&&n!==null&&Number.isFinite(n)&&n>=0?n*100/basisAmount:null;
 return {unit,calories:normalize(p.caloriesKcal),protein:normalize(p.proteinG),carbs:normalize(p.carbohydratesG),fat:normalize(p.fatG),sodium:normalize(p.sodiumMg)};
}
export function comparablePrice(p:CatalogItem){
 if(!Number.isFinite(p.quantity)||p.quantity<=0||!Number.isFinite(p.price)||p.price<=0)return null;
 // Only a single explicit total at the start of the saved sales description is usable.
 // Do not derive pack weight from the nutrition serving size or multiply ambiguous options.
 const total=p.detail.match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\s*·/i);
 if(total&&Number(total[1])>0){
  const unit=total[2].toLowerCase(),liquid=unit==='ml'||unit==='l';
  if(p.unit==='g'&&liquid)return null;
  if(p.unit==='개'&&p.quantity===1){const quantity=Number(total[1])*(unit==='kg'||unit==='l'?1000:1);return {amount:p.price/quantity*100,basis:liquid?'100mL':'100g'};}
 }
 return {amount:p.price/p.quantity*(p.unit==='g'?100:1),basis:p.unit==='g'?'100g':'1개'};
}
export function filterComparison(items:CatalogItem[],query:string,sort:ComparisonSort,locale='ko-KR'){
 const result=items.filter(p=>(p.name+' '+p.detail).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return result.sort((a,b)=>{
  if(sort==='name')return a.name.localeCompare(b.name,locale);
  if(sort==='price')return a.price-b.price||a.name.localeCompare(b.name,locale);
  const an=comparableNutrition(a),bn=comparableNutrition(b);
  const av=an.unit==='g'?an[sort]:null,bv=bn.unit==='g'?bn[sort]:null;
  if(av===null||bv===null)return av===bv?a.name.localeCompare(b.name,locale):av===null?1:-1;
  return (sort==='protein'?bv-av:av-bv)||a.name.localeCompare(b.name,locale);
 });
}
export const nutritionDisplay=(n:number|null,unit:string)=>n===null?'미확인':new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(n)+unit;
export const comparisonWon=(n:number)=>Math.round(n).toLocaleString('ko-KR')+'원';
export const productPath=(id:string)=>'/products/'+encodeURIComponent(id);
export const foodPath=(kind:string)=>'/foods/'+encodeURIComponent(kind);
export const safeStructuredJson=(value:unknown)=>JSON.stringify(value).replaceAll('<','\\u003c');
