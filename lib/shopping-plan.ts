import {validPlanDate} from './daily-plan';
import type { CatalogItem } from './catalog';

export type PlanProduct = CatalogItem & { servings: number; servingGrams?:number; servingNote: string; avoidanceText: string | null; personalizationScore?:number; servingCalories?:number|null };
export type MealSlot = 'breakfast'|'lunch'|'dinner';
export const slotLabels={breakfast:'아침',lunch:'점심',dinner:'저녁'};
export type PlanConditions = { startDate?:string; budget: number; meals: number; cooking: 'quick' | 'kit' | 'all'; avoid: string; owned: string[]; supply?:Record<string,number>; days?:number; slots?:MealSlot[] };
export const initialConditions: PlanConditions = {budget:50000,meals:7,cooking:'all',avoid:'',owned:[],days:7,slots:['dinner']};
export function mealSchedule(c:PlanConditions){
 const slots=c.slots??(c.meals>=10?['lunch','dinner'] as MealSlot[]:['dinner'] as MealSlot[]);
 return Array.from({length:c.meals},(_,i)=>({day:Math.floor(i/slots.length)+1,slot:slots[i%slots.length]}));
}
export function parseConditions(value: unknown): PlanConditions | null {
 if(!value || typeof value!=='object')return null;
 const p=value as PlanConditions;
 if(p.startDate!==undefined&&!validPlanDate(p.startDate))return null;
 if(!Number.isSafeInteger(p.budget)||p.budget<1000||p.budget>1000000||!Number.isInteger(p.meals)||p.meals<1||p.meals>21||!['quick','kit','all'].includes(p.cooking)||typeof p.avoid!=='string'||p.avoid.length>200||!Array.isArray(p.owned)||p.owned.length>100||p.owned.some(x=>typeof x!=='string'||x.length>100))return null;
 if(p.days!==undefined||p.slots!==undefined){if(!Number.isInteger(p.days)||p.days!<1||p.days!>7||!Array.isArray(p.slots)||!p.slots.length||p.slots.some(s=>!Object.hasOwn(slotLabels,s))||new Set(p.slots).size!==p.slots.length||p.meals!==p.days!*p.slots.length)return null;}
 if(p.supply!==undefined&&(!p.supply||typeof p.supply!=='object'||Array.isArray(p.supply)||Object.keys(p.supply).length>300||Object.entries(p.supply).some(([id,n])=>!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!Number.isFinite(n)||n<0||n>20000000)))return null;
 return {...p,owned:[...new Set(p.owned)]};
}
export function slotCandidates(products:PlanProduct[],c:PlanConditions,index:number){
 const breakfast=mealSchedule(c)[index]?.slot==='breakfast';
 return candidates(products,c).filter(p=>breakfast?/시리얼|그래놀라|샌드위치|오트밀|죽/.test(p.name):!/시리얼|그래놀라/.test(p.name));
}
export function validMealIds(ids:string[],products:PlanProduct[],c:PlanConditions){return ids.length===c.meals&&ids.every((id,i)=>slotCandidates(products,c,i).some(p=>p.id===id));}
const aliases: Record<string,string[]> = {우유:['우유','유제품','치즈','크림'],달걀:['달걀','계란','알류'],계란:['달걀','계란','알류'],소고기:['소고기','쇠고기','한우','비프'],돼지고기:['돼지고기','돈육','베이컨','삼겹'],닭고기:['닭','치킨'],콩:['콩','대두','두부'],밀:['밀','소맥'],새우:['새우','쉬림프']};
export function candidates(products: PlanProduct[], c: PlanConditions) {
 const avoid=c.avoid.split(/[,，\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
 return products.filter(p=>p.productUrl && p.price>0 && (c.cooking==='all'||(c.cooking==='kit'?p.category==='meal_kit':p.category!=='meal_kit')) && (!avoid.length || (p.avoidanceText!==null && !avoid.some(word=>(aliases[word]??[word]).some(a=>`${p.name} ${p.avoidanceText}`.toLowerCase().includes(a))))));
}
export function basket(ids: string[], products: PlanProduct[], owned: string[], supply:Record<string,number>={}) {
 const counts=new Map<string,number>();
 ids.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
 return [...counts].map(([id,uses])=>{
  const product=products.find(p=>p.id===id);
  if(!product)throw new Error('상품 정보가 변경됐어요. 식단을 다시 추천받아 주세요.');
  const packs=Math.ceil(uses/product.servings), have=owned.includes(id);
  return {product,uses,packs,have,left: packs*product.servings-uses,cost:have?0:Math.ceil(Math.max(0,uses/product.servings-(supply[id]??0)-0.000001))*product.price};
 });
}
export const basketTotal=(ids:string[], products:PlanProduct[], owned:string[],supply:Record<string,number>={})=>basket(ids,products,owned,supply).reduce((n,p)=>n+p.cost,0);
export function recommendShopping(products: PlanProduct[], c: PlanConditions): string[] | null {
 const pool=candidates(products,c);
 let states: {ids:string[];cost:number;score:number}[]=[{ids:[],cost:0,score:0}];
 for(let i=0;i<c.meals;i++){
  const next=new Map<string,{ids:string[];cost:number;score:number}>();
  for(const state of states)for(const p of slotCandidates(pool,c,i)){
   const ids=[...state.ids,p.id], rows=basket(ids,pool,c.owned,c.supply), cost=rows.reduce((n,r)=>n+r.cost,0);
   if(cost>c.budget)continue;
   const key=[...ids].sort().join('|');
   // Prefer variety while charging the full selling pack, including unused portions.
   const families=new Set(rows.map(r=>r.product.name.match(/볶음밥|솥밥|도시락|파스타|비빔국수|죽|샌드위치|시리얼/)?.[0]??r.product.category));
   const score=Math.min(new Set(ids).size,Math.ceil(c.meals/2))*300+families.size*150-rows.reduce((n,r)=>n+r.left,0)*100-cost/c.budget*100-(state.ids.at(-1)===p.id?80:0)+rows.reduce((n,r)=>n+(r.product.personalizationScore??0)*r.uses,0);
   if(!next.has(key))next.set(key,{ids,cost,score});
  }
  states=[...next.values()].sort((a,b)=>b.score-a.score||a.cost-b.cost).slice(0,100);
  if(!states.length)return null;
 }
 return states[0]?.ids??null;
}
export function swapMeal(ids:string[], index:number, products:PlanProduct[], c:PlanConditions):string[]|null {
 const options=slotCandidates(products,c,index).filter(p=>p.id!==ids[index]).map(p=>ids.map((id,i)=>i===index?p.id:id)).filter(next=>basketTotal(next,products,c.owned,c.supply)<=c.budget);
 options.sort((a,b)=>(products.find(p=>p.id===b[index])?.personalizationScore??0)-(products.find(p=>p.id===a[index])?.personalizationScore??0)||new Set(b).size-new Set(a).size||basketTotal(a,products,c.owned,c.supply)-basketTotal(b,products,c.owned,c.supply));
 return options[0]??null;
}
