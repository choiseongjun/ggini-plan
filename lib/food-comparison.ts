import type {FoodReference} from './food-reference';
export type ComparisonFood={slug:string;food:FoodReference};
export type FoodMetric='kcal'|'sugar'|'protein'|'sodium';
// Broad database categories (e.g. bakery) are not enough to recommend substitutes.
export function foodComparisonGroup(name:string):string|null{
 const groups:[string,RegExp][]=[['피자',/피자/],['버거',/버거/],['요거트',/요거트|요구르트/],['쉐이크',/쉐이크|셰이크/],['스무디',/스무디|프라페|프라푸치노/],['에이드',/에이드/],['주스',/주스|쥬스/],['라떼',/라떼|라테|카푸치노|마끼아또|마키아토/],['커피',/아메리카노|커피|콜드브루|에스프레소/],['차',/캐모마일|카모마일|히비스커스|페퍼민트|얼그레이|녹차|홍차|루이보스|허브차|티\b|티\s*[()]/],['닭가슴살',/닭가슴살/]];
 return groups.find(([,pattern])=>pattern.test(name))?.[0]??null;
}
export function comparisonUnit(unit:string){return unit.toLowerCase()==='ml'?'mL':unit.toLowerCase()==='g'?'g':null;}
export function nutrientPer100(food:FoodReference,metric:FoodMetric){
 const value=food[metric];return comparisonUnit(food.servingUnit)&&Number.isFinite(food.servingAmount)&&food.servingAmount>0&&value!==null&&Number.isFinite(value)&&value>=0?value/food.servingAmount*100:null;
}
export function comparableFoods(base:FoodReference,items:ComparisonFood[]){
 const group=foodComparisonGroup(base.name),unit=comparisonUnit(base.servingUnit);
 if(!group||!unit)return [];
 return items.filter(({food})=>food.code!==base.code&&foodComparisonGroup(food.name)===group&&comparisonUnit(food.servingUnit)===unit&&food.servingAmount>0);
}
export function rankComparison(items:ComparisonFood[],metric:FoodMetric){
 return [...items].sort((a,b)=>{const x=nutrientPer100(a.food,metric),y=nutrientPer100(b.food,metric);if(x===null)return y===null?a.slug.localeCompare(b.slug):1;if(y===null)return -1;return (metric==='protein'?y-x:x-y)||a.slug.localeCompare(b.slug);});
}
