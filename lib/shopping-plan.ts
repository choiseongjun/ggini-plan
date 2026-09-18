import {allowsMealKind,validMealKinds,type MealKind} from './meal-kinds';
import {validPlanDate} from './daily-plan';
import {isShoppingGoal,isBudgetMode,hasGoalNutrition,productsForGoal,type BudgetMode,type ShoppingGoal} from './shopping-goals';
import type { CatalogItem } from './catalog';
import {excludedFoods,type ExcludedFood} from './excluded-foods';
import {allowsExcludedFoods} from './shopping-exclusions';
import {mealRole} from './meal-role';
export const swapReasons={taste:'취향 아님',effort:'조리 귀찮음',price:'너무 비쌈',repeat:'비슷한 걸 먹었음'} as const;
export type SwapReason=keyof typeof swapReasons;
export type SwapPreference={id:string;family:string;reason:SwapReason;price:number;minutes:number};
export function validSwapPreferences(value:unknown):value is SwapPreference[]{
 return Array.isArray(value)&&value.length<=50&&value.every(p=>p&&typeof p==='object'&&typeof p.id==='string'&&p.id.length>0&&p.id.length<=200&&typeof p.family==='string'&&p.family.length<=200&&typeof p.reason==='string'&&Object.hasOwn(swapReasons,p.reason)&&Number.isFinite(p.price)&&p.price>=0&&p.price<=10000000&&Number.isFinite(p.minutes)&&p.minutes>=0&&p.minutes<=1440);
}

export type PlanProduct = CatalogItem & { mealSlots?:MealSlot[]; servings: number; servingGrams?:number; servingNote: string; avoidanceText: string | null; personalizationScore?:number; servingCalories?:number|null; recipe?: {assembly?:boolean;minutes:number;slots:MealSlot[];family:string;steps:string[];ingredients:{product:PlanProduct;packs:number;label:string}[];nutrition:{calories:number|null;protein:number|null}} };
export type MealSlot = 'breakfast'|'lunch'|'dinner';
export const slotLabels={breakfast:'아침',lunch:'점심',dinner:'저녁'};
export const MAX_PLAN_DAYS=15;
export const MAX_PLAN_MEALS=MAX_PLAN_DAYS*3;
export type PlanConditions = { mealCountMode?:boolean; swapPreferences?:SwapPreference[]; budgetMode?:BudgetMode; mealKinds?:MealKind[]; goal?:ShoppingGoal; mealMode?:'ready'|'cook'|'mixed'; excluded?:ExcludedFood[]; startDate?:string; budget: number; meals: number; cooking: 'quick' | 'kit' | 'all'; avoid: string; owned: string[]; supply?:Record<string,number>; days?:number; slots?:MealSlot[] };
export const initialConditions: PlanConditions = {mealMode:'mixed',budget:50000,meals:7,cooking:'all',avoid:'',owned:[],days:7,slots:['dinner']};
export function mealSchedule(c:PlanConditions){
 const slots=c.slots??(c.meals>=10?['lunch','dinner'] as MealSlot[]:['dinner'] as MealSlot[]);
 return Array.from({length:c.meals},(_,i)=>({day:Math.floor(i/slots.length)+1,slot:slots[i%slots.length]}));
}
export function parseConditions(value: unknown): PlanConditions | null {
 if(!value || typeof value!=='object')return null;
 const p=value as PlanConditions;
 if(p.mealCountMode!==undefined&&typeof p.mealCountMode!=='boolean')return null;
 if(p.mealCountMode&&(p.days===undefined||p.slots===undefined))return null;
 if(p.swapPreferences!==undefined&&!validSwapPreferences(p.swapPreferences))return null;
 if(p.mealKinds!==undefined&&!validMealKinds(p.mealKinds))return null;
 if(p.budgetMode!==undefined&&!isBudgetMode(p.budgetMode))return null;
 if(p.goal!==undefined&&!isShoppingGoal(p.goal))return null;
 if(p.mealMode!==undefined&&!['ready','cook','mixed'].includes(p.mealMode))return null;
 if(p.excluded!==undefined&&(!Array.isArray(p.excluded)||p.excluded.length>Object.keys(excludedFoods).length||p.excluded.some(key=>typeof key!=='string'||!Object.hasOwn(excludedFoods,key))))return null;
 if(p.startDate!==undefined&&!validPlanDate(p.startDate))return null;
 if(!Number.isSafeInteger(p.budget)||p.budget<1000||p.budget>1000000||!Number.isInteger(p.meals)||p.meals<1||p.meals>MAX_PLAN_MEALS||!['quick','kit','all'].includes(p.cooking)||typeof p.avoid!=='string'||p.avoid.length>200||!Array.isArray(p.owned)||p.owned.length>100||p.owned.some(x=>typeof x!=='string'||x.length>100))return null;
 if(p.days!==undefined||p.slots!==undefined){if(!Number.isInteger(p.days)||p.days!<1||p.days!>MAX_PLAN_DAYS||!Array.isArray(p.slots)||!p.slots.length||p.slots.some(s=>!Object.hasOwn(slotLabels,s))||new Set(p.slots).size!==p.slots.length||(p.mealCountMode?Math.ceil(p.meals/p.slots.length)!==p.days:p.meals!==p.days!*p.slots.length))return null;}
 if(p.supply!==undefined&&(!p.supply||typeof p.supply!=='object'||Array.isArray(p.supply)||Object.keys(p.supply).length>300||Object.entries(p.supply).some(([id,n])=>!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!Number.isFinite(n)||n<0||n>20000000)))return null;
 return {...p,owned:[...new Set(p.owned)]};
}
export function slotCandidates(products:PlanProduct[],c:PlanConditions,index:number){
 const breakfast=mealSchedule(c)[index]?.slot==='breakfast';
 return candidates(products,c).filter(p=>p.recipe?p.recipe.slots.includes(mealSchedule(c)[index]?.slot):p.mealSlots?p.mealSlots.includes(mealSchedule(c)[index]?.slot):breakfast?/시리얼|그래놀라|샌드위치|오트밀|죽/.test(p.name):!/시리얼|그래놀라/.test(p.name));
}
export const cookingDishId=(id:string)=>id.split('--auto--')[0].split('--with--')[0];
export function validMealIds(ids:string[],products:PlanProduct[],c:PlanConditions){return ids.length===c.meals&&new Set(ids.map(cookingDishId)).size===ids.length&&ids.every((id,i)=>slotCandidates(products,c,i).some(p=>p.id===id));}
const aliases: Record<string,string[]> = {우유:['우유','유제품','치즈','크림'],달걀:['달걀','계란','알류'],계란:['달걀','계란','알류'],소고기:['소고기','쇠고기','한우','비프'],돼지고기:['돼지고기','돈육','베이컨','삼겹'],닭고기:['닭','치킨'],콩:['콩','대두','두부'],밀:['밀','소맥'],새우:['새우','쉬림프']};
export function candidates(products: PlanProduct[], c: PlanConditions) {
 const avoid=c.avoid.split(/[,，\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
 return products.filter(p=>mealRole(p)==='meal'&&hasGoalNutrition(p,c.goal)&&allowsMealKind(p,c.mealKinds)&&allowsExcludedFoods(p,c.excluded??[])&&(p.productUrl||p.recipe) && p.price>0 && ((c.mealMode??'ready')==='mixed'||((c.mealMode??'ready')==='cook'?!!p.recipe&&!p.recipe.assembly:!p.recipe||!!p.recipe.assembly)) && (!!p.recipe&&!p.recipe.assembly||c.cooking==='all'||(c.cooking==='kit'?p.category==='meal_kit':p.category!=='meal_kit')) && (!avoid.length || (p.avoidanceText!==null && !avoid.some(word=>(aliases[word]??[word]).some(a=>`${p.name} ${p.avoidanceText}`.toLowerCase().includes(a))))));
}
export function basket(ids: string[], products: PlanProduct[], owned: string[], supply:Record<string,number>={}) {
 const counts=new Map<string,number>();
 const unassigned=new Map(purchaseBasket(ids,products,owned,supply).map(r=>[r.product.id,r.cost]));
 ids.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
 return [...counts].map(([id,uses])=>{
  const product=products.find(p=>p.id===id);
  if(!product)throw new Error('상품 정보가 변경됐어요. 식단을 다시 추천받아 주세요.');
  const packs=Math.ceil(uses/product.servings), have=owned.includes(id);
  let cost=0;for(const part of product.recipe?.ingredients??[{product}]){cost+=unassigned.get(part.product.id)??0;unassigned.delete(part.product.id);}
  return {product,uses,packs,have,left: packs*product.servings-uses,cost};
 });
}
export function purchaseBasket(ids:string[],products:PlanProduct[],owned:string[],supply:Record<string,number>={},portions?:Record<string,number>){
 const meals=new Map<string,number>();ids.forEach(id=>meals.set(id,(meals.get(id)??0)+1));
 const rows=new Map<string,{product:PlanProduct;required:number}>();
 for(const [id,count] of meals){
  const p=products.find(p=>p.id===id);if(!p)throw new Error('메뉴 정보가 변경됐어요. 다시 추천받아 주세요.');
  const uses=portions?(portions[id]??0):count;if(uses<=0)continue;
  for(const part of p.recipe?.ingredients??[{product:p,packs:1/p.servings}]){
   const row=rows.get(part.product.id)??{product:part.product,required:0};row.required+=uses*part.packs;rows.set(part.product.id,row);
  }
 }
 return [...rows.values()].map(({product,required})=>{const have=owned.includes(product.id),available=supply[product.id]??0;
  const packs=have?0:Math.ceil(Math.max(0,required-available-0.000001));
  return {product,required:have?0:required,have,packs,cost:packs*product.price,left:have?0:Math.max(0,available+packs-required)};
 });
}
export const basketTotal=(ids:string[], products:PlanProduct[], owned:string[],supply:Record<string,number>={})=>basket(ids,products,owned,supply).reduce((n,p)=>n+p.cost,0);
export function mealFamily(p:PlanProduct){return p.recipe?.family??p.name.match(/炒飯|燉飯|義大利麵|볶음밥|덮밥|비빔밥|솥밥|도시락|파스타|라자냐|리조또|비빔국수|쌀국수|칼국수|우동|냉면|김밥|주먹밥|죽|샌드위치|잠봉뵈르|시리얼|그래놀라/)?.[0]??p.foodType??p.name.replace(/\[[^\]]+\]/g,'').trim();}
function planScore(ids:string[],rows:ReturnType<typeof basket>,c:PlanConditions,schedule:ReturnType<typeof mealSchedule>,previous:ReadonlySet<string>=new Set(),previousFamilies:ReadonlySet<string>=new Set()){
 const products=new Map(rows.map(r=>[r.product.id,r.product]));
 const families=new Map<string,number>();
 for(const r of rows){const family=mealFamily(r.product);families.set(family,(families.get(family)??0)+r.uses);}
 let repetition=0;
 for(let i=0;i<ids.length;i++){
  if(i>0&&ids[i]===ids[i-1])repetition+=300;
  for(let j=i-1;j>=0&&schedule[j]?.day===schedule[i]?.day;j--)if(ids[j]===ids[i])repetition+=600;
 }
 const repeats=rows.reduce((n,r)=>n+r.uses*(r.uses-1)/2,0);
 const familyRepeats=[...families.values()].reduce((n,count)=>n+count*(count-1)/2,0);
 const feedback=ids.reduce((sum,id)=>{const p=products.get(id)!;return sum+(c.swapPreferences??[]).reduce((n,f)=>n+(
  f.reason==='taste'?(p.id===f.id?1400:mealFamily(p)===f.family?250:0):
  f.reason==='repeat'?(mealFamily(p)===f.family?450:0):
  f.reason==='price'?(p.price/p.servings>=f.price?180:0):
  (p.recipe?.minutes??(p.category==='meal_kit'?20:5))>=f.minutes?250:0),0);},0);
 const fit=ids.reduce((n,id)=>n+Math.max(-150,Math.min(160,products.get(id)?.personalizationScore??0)),0);
 const ingredients=new Map<string,number>();
 for(const id of ids){const recipe=products.get(id)?.recipe;if(recipe&&!recipe.assembly)for(const part of recipe.ingredients)ingredients.set(part.product.id,(ingredients.get(part.product.id)??0)+1);}
 // Prefer reusing a few ingredients across distinct dishes, within existing nutrition and budget constraints.
 const reuse=[...ingredients.values()].reduce((sum,count)=>sum+Math.min(3,count-1)*45,0)-ingredients.size*15;
 return reuse+rows.length*300-feedback-ids.filter(id=>previous.has(id)).length*900-ids.filter(id=>previousFamilies.has(mealFamily(products.get(id)!))).length*200+families.size*150-repeats*350-familyRepeats*40-repetition
  -rows.reduce((n,r)=>n+r.left,0)*100-rows.reduce((n,r)=>n+r.cost,0)/c.budget*(c.budgetMode==='save'?2000:c.budgetMode==='full'?-100:100)+fit;
}
function diverseOptions(products:PlanProduct[],previous:string[],conditions:PlanConditions){
 if(products.length<=80)return products;
 const old=new Set(previous);
 const costs=new Map(products.map(p=>[p.id,purchaseBasket([p.id],[p],conditions.owned,conditions.supply).reduce((sum,r)=>sum+r.cost,0)]));
 const byCost=[...products].sort((a,b)=>costs.get(a.id)!-costs.get(b.id)!||a.price/a.servings-b.price/b.servings);
 const groups=new Map<string,PlanProduct[]>();
 for(const p of [...byCost].sort((a,b)=>Number(old.has(a.id))-Number(old.has(b.id)))){
  const key=mealFamily(p);groups.set(key,[...(groups.get(key)??[]),p]);
 }
 const selected=new Map(byCost.slice(0,12).map(p=>[p.id,p]));
 // Retain nutritional fits before the cost/family shortlist is capped at 80.
 for(const p of [...products].sort((a,b)=>(b.personalizationScore??0)-(a.personalizationScore??0)).slice(0,20))selected.set(p.id,p);
 for(let i=0;selected.size<80;i++){
  let added=false;
  for(const group of groups.values()){if(group[i]){selected.set(group[i].id,group[i]);added=true;}if(selected.size>=80)break;}
  if(!added)break;
 }
 return [...selected.values()];
}
export function recommendShopping(products: PlanProduct[], c: PlanConditions, cheapest=false,previousIds:string[]=[]): string[] | null {
 const pool=productsForGoal(candidates(products,c).filter(p=>!p.recipe||!p.id.includes('--with--')),c.goal);
 const schedule=mealSchedule(c),options=schedule.map((_,i)=>diverseOptions(slotCandidates(pool,c,i),previousIds,c));
 if(new Set(pool.map(p=>cookingDishId(p.id))).size<c.meals)return null;
 const previous=new Set(previousIds);
 const previousFamilies=new Set(pool.filter(p=>previous.has(p.id)).map(mealFamily));
 let states: {ids:string[];cost:number;score:number}[]=[{ids:[],cost:0,score:0}];
 for(let i=0;i<c.meals;i++){
  const next=new Map<string,{ids:string[];cost:number;score:number}>();
  for(const state of states)for(const p of options[i]){
   if(state.ids.some(id=>cookingDishId(id)===cookingDishId(p.id)))continue;
   const ids=[...state.ids,p.id], rows=basket(ids,pool,c.owned,c.supply), cost=rows.reduce((n,r)=>n+r.cost,0);
   if(cost>c.budget)continue;
   // Preserve the current day's order and the previous meal when merging states.
   const dayStart=schedule.findIndex(s=>s.day===schedule[i].day);
   const key=JSON.stringify([[...ids].sort(),ids.slice(Math.max(0,dayStart-1))]);
   const score=cheapest?-cost:planScore(ids,rows,c,schedule,previous,previousFamilies);
   if(!next.has(key)||score>next.get(key)!.score)next.set(key,{ids,cost,score});
  }
  const ranked=[...next.values()].sort((a,b)=>b.score-a.score||a.cost-b.cost);
  // Keep inexpensive paths as well, so early variety cannot exhaust the budget.
  states=[...new Set([...ranked.slice(0,80),...[...ranked].sort((a,b)=>a.cost-b.cost||b.score-a.score).slice(0,20)])];
  if(!states.length)return null;
 }
 return states.sort((a,b)=>b.score-a.score||a.cost-b.cost)[0]?.ids??null;
}
export function swapMeal(ids:string[], index:number, products:PlanProduct[], c:PlanConditions,reason?:SwapReason):string[]|null {
 const old=products.find(p=>p.id===ids[index]);
 products=productsForGoal(products,c.goal);
 const options=slotCandidates(products,c,index).filter(p=>!ids.some(id=>cookingDishId(id)===cookingDishId(p.id))).filter(p=>!old||!reason||(
  reason==='price'?basketTotal(ids.map((id,i)=>i===index?p.id:id),products,c.owned,c.supply)<basketTotal(ids,products,c.owned,c.supply):
  reason==='effort'?(p.recipe?.minutes??(p.category==='meal_kit'?20:5))<(old.recipe?.minutes??(old.category==='meal_kit'?20:5)):
  reason==='repeat'?mealFamily(p)!==mealFamily(old):true
 )).map(p=>ids.map((id,i)=>i===index?p.id:id)).filter(next=>basketTotal(next,products,c.owned,c.supply)<=c.budget);
 const schedule=mealSchedule(c);
 options.sort((a,b)=>planScore(b,basket(b,products,c.owned,c.supply),c,schedule)-planScore(a,basket(a,products,c.owned,c.supply),c,schedule));
 return options[0]??null;
}
