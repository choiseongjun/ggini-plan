import type { CatalogItem } from './catalog';

export type PlanProduct = CatalogItem & { servings: number; servingNote: string; avoidanceText: string | null };
export type PlanConditions = { budget: number; meals: number; cooking: 'quick' | 'kit' | 'all'; avoid: string; owned: string[] };
export const initialConditions: PlanConditions = {budget:30000,meals:5,cooking:'all',avoid:'',owned:[]};
export function parseConditions(value: unknown): PlanConditions | null {
 if(!value || typeof value!=='object')return null;
 const p=value as PlanConditions;
 if(!Number.isSafeInteger(p.budget)||p.budget<1000||p.budget>1000000||!Number.isInteger(p.meals)||p.meals<1||p.meals>14||!['quick','kit','all'].includes(p.cooking)||typeof p.avoid!=='string'||p.avoid.length>200||!Array.isArray(p.owned)||p.owned.length>100||p.owned.some(x=>typeof x!=='string'||x.length>100))return null;
 return {...p,owned:[...new Set(p.owned)]};
}
const aliases: Record<string,string[]> = {우유:['우유','유제품','치즈','크림'],달걀:['달걀','계란','알류'],계란:['달걀','계란','알류'],소고기:['소고기','쇠고기','한우','비프'],돼지고기:['돼지고기','돈육','베이컨','삼겹'],닭고기:['닭','치킨'],콩:['콩','대두','두부'],밀:['밀','소맥'],새우:['새우','쉬림프']};
export function candidates(products: PlanProduct[], c: PlanConditions) {
 const avoid=c.avoid.split(/[,，\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
 return products.filter(p=>p.productUrl && p.price>0 && (c.cooking==='all'||(c.cooking==='kit'?p.category==='meal_kit':p.category!=='meal_kit')) && (!avoid.length || (p.avoidanceText!==null && !avoid.some(word=>(aliases[word]??[word]).some(a=>`${p.name} ${p.avoidanceText}`.toLowerCase().includes(a))))));
}
export function basket(ids: string[], products: PlanProduct[], owned: string[]) {
 const counts=new Map<string,number>();
 ids.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
 return [...counts].map(([id,uses])=>{
  const product=products.find(p=>p.id===id);
  if(!product)throw new Error('상품 정보가 변경됐어요. 식단을 다시 추천받아 주세요.');
  const packs=Math.ceil(uses/product.servings), have=owned.includes(id);
  return {product,uses,packs,have,left: packs*product.servings-uses,cost:have?0:packs*product.price};
 });
}
export const basketTotal=(ids:string[], products:PlanProduct[], owned:string[])=>basket(ids,products,owned).reduce((n,p)=>n+p.cost,0);
export function recommendShopping(products: PlanProduct[], c: PlanConditions): string[] | null {
 const pool=candidates(products,c);
 let states: {ids:string[];cost:number;score:number}[]=[{ids:[],cost:0,score:0}];
 for(let i=0;i<c.meals;i++){
  const next=new Map<string,{ids:string[];cost:number;score:number}>();
  for(const state of states)for(const p of pool){
   const ids=[...state.ids,p.id], rows=basket(ids,pool,c.owned), cost=rows.reduce((n,r)=>n+r.cost,0);
   if(cost>c.budget)continue;
   const key=[...ids].sort().join('|');
   // Prefer variety while charging the full selling pack, including unused portions.
   const score=new Set(ids).size*1000-rows.reduce((n,r)=>n+r.left,0)*30-cost/c.budget*100;
   if(!next.has(key))next.set(key,{ids,cost,score});
  }
  states=[...next.values()].sort((a,b)=>b.score-a.score||a.cost-b.cost).slice(0,100);
  if(!states.length)return null;
 }
 return states[0]?.ids??null;
}
export function swapMeal(ids:string[], index:number, products:PlanProduct[], c:PlanConditions):string[]|null {
 const options=candidates(products,c).filter(p=>p.id!==ids[index]).map(p=>ids.map((id,i)=>i===index?p.id:id)).filter(next=>basketTotal(next,products,c.owned)<=c.budget);
 options.sort((a,b)=>new Set(b).size-new Set(a).size||basketTotal(a,products,c.owned)-basketTotal(b,products,c.owned));
 return options[0]??null;
}
