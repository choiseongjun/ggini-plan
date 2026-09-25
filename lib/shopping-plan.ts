import {allowsCookingEffort,isCookingEffort,type CookingEffort} from './cooking-effort';
import {validStockId} from './stock-id';
import {allowsMealKind,validMealKinds,type MealKind} from './meal-kinds';
import {validPlanDate} from './daily-plan';
import {isShoppingGoal,isBudgetMode,hasGoalNutrition,productsForGoal,type BudgetMode,type ShoppingGoal} from './shopping-goals';
import type { CatalogItem } from './catalog';
import {excludedFoods,type ExcludedFood} from './excluded-foods';
import {allowsExcludedFoods} from './shopping-exclusions';
import {mealRole} from './meal-role';
import {SODIUM_DAILY,SODIUM_DAILY_PRESSURE,type TodayContext} from './today-context';
export const swapReasons={taste:'취향 아님',effort:'조리 귀찮음',price:'너무 비쌈',repeat:'비슷한 걸 먹었음'} as const;
// 조리 시간은 모든 레시피가 같은 고정값이라 '조리 귀찮음'으로는 가려낼 수 없다. 저장 형식은 호환을 위해 두고 화면에서만 뺀다.
export const visibleSwapReasons=(['taste','price','repeat'] as const);
export type SwapReason=keyof typeof swapReasons;
export type SwapPreference={id:string;family:string;reason:SwapReason;price:number;minutes:number};
export function validSwapPreferences(value:unknown):value is SwapPreference[]{
 return Array.isArray(value)&&value.length<=50&&value.every(p=>p&&typeof p==='object'&&typeof p.id==='string'&&p.id.length>0&&p.id.length<=200&&typeof p.family==='string'&&p.family.length<=200&&typeof p.reason==='string'&&Object.hasOwn(swapReasons,p.reason)&&Number.isFinite(p.price)&&p.price>=0&&p.price<=10000000&&Number.isFinite(p.minutes)&&p.minutes>=0&&p.minutes<=1440);
}

export type PlanProduct = CatalogItem & { mealSlots?:MealSlot[]; servings: number; servingGrams?:number; servingNote: string; avoidanceText: string | null; personalizationScore?:number; servingCalories?:number|null; servingSodium?:number|null; servingCarbs?:number|null; recipe?: {composition?:{templateId:string;version:number;items:{id:string;role:string;reason:string}[]};sideCount?:number;sides?:{name:string;steps:string[];minutes:number}[];assembly?:boolean;minutes:number;slots:MealSlot[];family:string;steps:string[];ingredients:{product:PlanProduct;packs:number;label:string;group?:string}[];nutrition:{calories:number|null;protein:number|null}} };
export type MealSlot = 'breakfast'|'lunch'|'dinner';
export const slotLabels={breakfast:'아침',lunch:'점심',dinner:'저녁'};
export const MAX_PLAN_DAYS=15;
export const MAX_PLAN_MEALS=MAX_PLAN_DAYS*3;
export type PlanConditions = { cookingEffort?:CookingEffort; people?:number; sideCount?:number; mealCountMode?:boolean; swapPreferences?:SwapPreference[]; budgetMode?:BudgetMode; mealKinds?:MealKind[]; goal?:ShoppingGoal; mealMode?:'ready'|'cook'|'mixed'; excluded?:ExcludedFood[]; startDate?:string; budget: number; meals: number; cooking: 'quick' | 'kit' | 'all'; avoid: string; owned: string[]; supply?:Record<string,number>; days?:number; slots?:MealSlot[] };
export const initialConditions: PlanConditions = {cookingEffort:'easy',people:1,sideCount:0,mealMode:'mixed',budget:50000,meals:7,cooking:'all',avoid:'',owned:[],days:7,slots:['dinner']};
// New Korean home recommendations cover every meal; legacy saved plans keep their schedule.
export const initialHomeConditions:PlanConditions={...initialConditions,days:7,meals:21,slots:['breakfast','lunch','dinner']};
export function mealSchedule(c:PlanConditions){
 const slots=c.slots??(c.meals>=10?['lunch','dinner'] as MealSlot[]:['dinner'] as MealSlot[]);
 return Array.from({length:c.meals},(_,i)=>({day:Math.floor(i/slots.length)+1,slot:slots[i%slots.length]}));
}
export function parseConditions(value: unknown): PlanConditions | null {
 if(!value || typeof value!=='object')return null;
 const p=value as PlanConditions;
 if(p.cookingEffort!==undefined&&!isCookingEffort(p.cookingEffort))return null;
 if(p.people!==undefined&&(!Number.isInteger(p.people)||p.people<1||p.people>4))return null;
 if(p.sideCount!==undefined&&(!Number.isInteger(p.sideCount)||p.sideCount<0||p.sideCount>2))return null;
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
 if(p.supply!==undefined&&(!p.supply||typeof p.supply!=='object'||Array.isArray(p.supply)||Object.keys(p.supply).length>300||Object.entries(p.supply).some(([id,n])=>!validStockId(id)||!Number.isFinite(n)||n<0||n>20000000)))return null;
 return {...p,owned:[...new Set(p.owned)]};
}
export function slotCandidates(products:PlanProduct[],c:PlanConditions,index:number){
 const breakfast=mealSchedule(c)[index]?.slot==='breakfast';
 return candidates(products,c).filter(p=>p.recipe?p.recipe.slots.includes(mealSchedule(c)[index]?.slot):p.mealSlots?p.mealSlots.includes(mealSchedule(c)[index]?.slot):breakfast?/시리얼|그래놀라|샌드위치|오트밀|죽/.test(p.name):!/시리얼|그래놀라/.test(p.name));
}
export const cookingDishId=(id:string)=>id.split('--sides-')[0].split('--auto--')[0].split('--with--')[0];
export function mainIngredients(p:PlanProduct):string[]{
 const name=p.name.replace(/\[[^\]]*\]/g,'');
 const meat: [string,RegExp][]=[['beef',/소불고기|소고기|쇠고기|한우|비프/],['pork',/돼지|돈육|한돈|삼겹|목살|제육|베이컨|햄|잠봉/],['chicken',/닭|치킨/],['duck',/오리/],['fish',/생선|연어|고등어|삼치|참치|명태|대구살/],['shrimp',/새우|쉬림프/]];
 const keys=meat.filter(([,pattern])=>pattern.test(name)).map(([key])=>key);
 if(keys.length)return keys;
 return ([['tofu',/두부/],['egg',/달걀|계란|에그/]] as [string,RegExp][]).filter(([,pattern])=>pattern.test(name)).map(([key])=>key);
}
export function repeatsDailyMain(ids:string[],products:PlanProduct[],c:PlanConditions,index:number,candidate:PlanProduct){
 const schedule=mealSchedule(c),slot=schedule[index];
 if(!slot||slot.slot==='breakfast')return false;
 const keys=mainIngredients(candidate);if(!keys.length)return false;
 return ids.some((id,i)=>{if(i===index||schedule[i]?.day!==slot.day||schedule[i]?.slot==='breakfast')return false;const other=productById(products,id);return !!other&&mainIngredients(other).some(key=>keys.includes(key));});
}
export function validMealIds(ids:string[],products:PlanProduct[],c:PlanConditions){return ids.length===c.meals&&new Set(ids.map(cookingDishId)).size===ids.length&&ids.every((id,i)=>{const p=slotCandidates(products,c,i).find(p=>p.id===id);return !!p&&!repeatsDailyMain(ids,products,c,i,p);});}
const aliases: Record<string,string[]> = {우유:['우유','유제품','치즈','크림'],달걀:['달걀','계란','알류'],계란:['달걀','계란','알류'],소고기:['소고기','쇠고기','한우','비프'],돼지고기:['돼지고기','돈육','베이컨','삼겹'],닭고기:['닭','치킨'],콩:['콩','대두','두부'],밀:['밀','소맥'],새우:['새우','쉬림프']};
// 250kcal도 안 되는 흰죽·누룽지 같은 메뉴는 한 끼 후보에서 뺀다 (영양값이 확인된 경우에만).
export function candidates(products: PlanProduct[], c: PlanConditions) {
 const avoid=c.avoid.split(/[,，\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
 return products.filter(p=>allowsCookingEffort(p,c.cookingEffort)&&(!p.recipe||p.recipe.assembly||(p.recipe.sideCount??0)===(c.sideCount??0))&&mealRole(p)==='meal'&&hasGoalNutrition(p,c.goal)&&allowsMealKind(p,c.mealKinds)&&allowsExcludedFoods(p,c.excluded??[])&&(p.productUrl||p.recipe) && p.price>0 && !(typeof p.servingCalories==='number'&&p.servingCalories<(p.recipe?.slots.every(s=>s==='breakfast')?120:250)) && !(p.recipe&&/(소스|양념장|드레싱)$/.test(p.name.split('_')[0])) && ((c.mealMode??'ready')==='mixed'||((c.mealMode??'ready')==='cook'?!!p.recipe&&!p.recipe.assembly:!p.recipe||!!p.recipe.assembly)) && (!!p.recipe&&!p.recipe.assembly||c.cooking==='all'||(c.cooking==='kit'?p.category==='meal_kit':p.category!=='meal_kit')) && (!avoid.length || (p.avoidanceText!==null && !avoid.some(word=>(aliases[word]??[word]).some(a=>`${p.name} ${p.avoidanceText}`.toLowerCase().includes(a))))));
}
// id → 메뉴 색인. 추천 탐색이 장보기 금액을 수십만 번 계산하는데, 매번 1,000개가 넘는 메뉴를
// 처음부터 훑던 find()가 추천 시간(약 9초)의 대부분이었다. 같은 배열이면 색인을 재사용한다.
const productIndexes=new WeakMap<PlanProduct[],Map<string,PlanProduct>>();
export function productById(products:PlanProduct[],id:string){
 let index=productIndexes.get(products);
 if(!index||index.size!==products.length){index=new Map(products.map(p=>[p.id,p]));productIndexes.set(products,index);}
 return index.get(id);
}
export function basket(ids: string[], products: PlanProduct[], owned: string[], supply:Record<string,number>={},people=1) {
 const counts=new Map<string,number>();
 const purchase=purchaseBasket(ids,products,owned,supply,undefined,people);
 const unassigned=new Map(purchase.map(r=>[r.product.id,r.cost]));
 // 다 쓰지 못하고 남는 재료값(원) — 추천 점수에서 재료 돌려쓰기를 평가할 때 쓴다.
 const waste=purchase.reduce((n,r)=>n+r.left*r.product.price,0);
 ids.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
 const rows=[...counts].map(([id,uses])=>{
  const product=productById(products,id);
  if(!product)throw new Error('상품 정보가 변경됐어요. 식단을 다시 추천받아 주세요.');
  const packs=Math.ceil(uses*people/product.servings), have=owned.includes(id);
  let cost=0;for(const part of product.recipe?.ingredients??[{product}]){cost+=unassigned.get(part.product.id)??0;unassigned.delete(part.product.id);}
  return {product,uses,packs,have,left: packs*product.servings-uses*people,cost};
 });
 return Object.assign(rows,{waste});
}
export function purchaseBasket(ids:string[],products:PlanProduct[],owned:string[],supply:Record<string,number>={},portions?:Record<string,number>,people=1){
 const meals=new Map<string,number>();ids.forEach(id=>meals.set(id,(meals.get(id)??0)+1));
 const rows=new Map<string,{product:PlanProduct;required:number}>();
 for(const [id,count] of meals){
  const p=productById(products,id);if(!p)throw new Error('메뉴 정보가 변경됐어요. 다시 추천받아 주세요.');
  const uses=portions?(portions[id]??0):count*people;if(uses<=0)continue;
  for(const part of p.recipe?.ingredients??[{product:p,packs:1/p.servings}]){
   const row=rows.get(part.product.id)??{product:part.product,required:0};row.required+=uses*part.packs;rows.set(part.product.id,row);
  }
 }
 return [...rows.values()].map(({product,required})=>{const have=owned.includes(product.id),available=supply[product.id]??0;
  const packs=have?0:Math.ceil(Math.max(0,required-available-0.000001));
  // 요리 재료는 통째로 산 포장값이 아니라 실제로 쓰는 양(g)만큼만 비용으로 잡는다. 몇 개를 사야 하는지(packs)는
  // 장보기 목록용으로 그대로 두고, 식단 비용·예산은 사용량 기준. 완제품(간편식 등)은 여전히 포장 단위.
  const cost=have?0:product.category==='ingredient'?Math.round(Math.max(0,required-available)*product.price):packs*product.price;
  return {product,required:have?0:required,have,packs,cost,left:have?0:Math.max(0,available+packs-required)};
 });
}
export const basketTotal=(ids:string[], products:PlanProduct[], owned:string[],supply:Record<string,number>={},people=1)=>basket(ids,products,owned,supply,people).reduce((n,p)=>n+p.cost,0);
export function mealFamily(p:PlanProduct){return p.recipe?.family??p.name.match(/炒飯|燉飯|義大利麵|볶음밥|덮밥|비빔밥|솥밥|도시락|파스타|라자냐|리조또|비빔국수|쌀국수|칼국수|우동|냉면|김밥|주먹밥|죽|샌드위치|잠봉뵈르|시리얼|그래놀라/)?.[0]??p.foodType??p.name.replace(/\[[^\]]+\]/g,'').trim();}
// 이름 뒤의 변형만 다른 요리(라면_김치·라면_치즈, 된장찌개_두부…)는 같은 음식이다. 각각 다른 id라서
// 중복 금지를 피해 한 식단에 여러 번 뽑히던 문제를 막는 기준. 인스턴트 면류는 하나의 '라면'으로 묶는다.
// "미역 된장국"과 "된장국_미역"처럼 단어 순서만 다른 같은 음식: 이름의 단어를 정렬해 비교한다.
export function dishWords(p:PlanProduct){return (p.recipe?p.name:cookingDishId(p.id)).split(/[_\s]+/).filter(Boolean).sort().join('|');}
const sameDish=(a:PlanProduct,b:PlanProduct)=>dishBase(a)===dishBase(b)||dishWords(a)===dishWords(b);
export function dishBase(p:PlanProduct){
 const name=(p.recipe?p.name:cookingDishId(p.id)).split('_')[0].replace(/\s+/g,'');
 return /라면|용기면|컵라면/.test(name)?'라면':name;
}
const SEAFOOD=/가자미|고등어|갈치|조기|삼치|꽁치|연어|참치|명태|동태|코다리|황태|북어|임연수|넙치|광어|우럭|도미|민어|병어|장어|오징어|낙지|주꾸미|새우|굴|홍합|바지락|전복|꽃게|멸치|대구|아귀/;
const MEAT_OR_EGG=/고기|돼지|소고기|쇠고기|닭|오리|햄|소시지|베이컨|육|갈비|삼겹|목살|달걀|계란|두부|해물|어묵|맛살|참치|돈까스|돈가스|까스/;
// '지금의 나'에 맞추는 점수: 오늘 먹은 양을 뺀 남은 열량, 하루 나트륨, 혈당 관리 시 탄수화물, 최근 먹은 메뉴.
// 식단 시작일이 오늘이면 1일차 남은 끼니가 오늘 먹은 기록의 영향을 받는다.
type ScoreContext={ctx:TodayContext;startsToday:boolean;recentBases:ReadonlySet<string>;recentMeats:ReadonlySet<string>};
function prepareContext(ctx:TodayContext|undefined|null,c:PlanConditions,products:PlanProduct[]):ScoreContext|undefined{
 if(!ctx)return undefined;
 const recent=ctx.recent.flatMap(id=>{const p=productById(products,id);return p?[p]:[];});
 return {ctx,startsToday:c.startDate===ctx.day,recentBases:new Set(recent.map(dishBase)),recentMeats:new Set(recent.flatMap(mainIngredients))};
}
const kcalFit=(kcal:number,target:number)=>Math.max(-150,100-200*Math.abs(kcal-target)/target);
function contextScore(ids:string[],products:ReadonlyMap<string,PlanProduct>,schedule:ReturnType<typeof mealSchedule>,s:ScoreContext){
 const {ctx}=s,pressure=ctx.health.includes('pressure'),glucose=ctx.health.includes('glucose');
 const limit=pressure?SODIUM_DAILY_PRESSURE:SODIUM_DAILY;
 let score=0;
 const days=new Map<number,number[]>();
 ids.forEach((_,i)=>{const d=schedule[i]?.day;if(d!==undefined)days.set(d,[...(days.get(d)??[]),i]);});
 for(const [day,indexes] of days){
  const today=s.startsToday&&day===1,eatenMeals=today?ctx.eaten.meals:0;
  // 하루 나트륨: 이 날 먹는 끼니 수만큼의 몫을 넘긴 만큼 감점(혈압 관리면 3배).
  const allowance=limit*Math.min(1,(indexes.length+eatenMeals)/Math.max(1,ctx.mealsPerDay));
  const sodium=indexes.reduce((n,i)=>n+(products.get(ids[i])?.servingSodium??0),today?ctx.eaten.sodium:0);
  score-=Math.max(0,sodium-allowance)/100*(pressure?45:15);
  // 오늘 이미 먹었으면 남은 열량을 남은 끼니에 나눠 목표로 삼는다(기본 한 끼 목표 점수를 대체).
  if(today&&eatenMeals>0&&ctx.dailyKcal&&ctx.perMealKcal){
   const target=Math.min(ctx.perMealKcal*1.3,Math.max(ctx.perMealKcal*0.5,(ctx.dailyKcal-ctx.eaten.kcal)/indexes.length));
   for(const i of indexes){const kcal=products.get(ids[i])?.servingCalories;if(typeof kcal==='number')score+=(kcalFit(kcal,target)-kcalFit(kcal,ctx.perMealKcal))*3;}
  }
  // 최근 3일 안에 먹은 메뉴·같은 주재료는 앞쪽 날짜에서 피한다.
  if(day<=2)for(const i of indexes){const p=products.get(ids[i]);if(!p)continue;if(s.recentBases.has(dishBase(p)))score-=day===1?900:500;if(day===1&&mainIngredients(p).some(k=>s.recentMeats.has(k)))score-=150;}
 }
 // 혈당 관리: 한 끼 탄수화물 70g을 넘는 만큼 감점.
 if(glucose)for(const id of ids)score-=Math.max(0,(products.get(id)?.servingCarbs??0)-70)*8;
 return score;
}
function planScore(ids:string[],rows:ReturnType<typeof basket>,c:PlanConditions,schedule:ReturnType<typeof mealSchedule>,previous:ReadonlySet<string>=new Set(),previousFamilies:ReadonlySet<string>=new Set(),context?:ScoreContext){
 const products=new Map(rows.map(r=>[r.product.id,r.product]));
 const families=new Map<string,number>();
 for(const r of rows){const family=mealFamily(r.product);families.set(family,(families.get(family)??0)+r.uses);}
 let repetition=0;
 for(let i=0;i<ids.length;i++){
  if(i>0&&ids[i]===ids[i-1])repetition+=300;
  for(let j=i-1;j>=0&&schedule[j]?.day===schedule[i]?.day;j--)if(ids[j]===ids[i])repetition+=600;
 }
 const repeats=rows.reduce((n,r)=>n+r.uses*(r.uses-1)/2,0);
 const bases=new Map<string,number>();
 for(const id of ids){const p=products.get(id);if(p){const b=dishBase(p);bases.set(b,(bases.get(b)??0)+1);}}
 const baseRepeats=[...bases.values()].reduce((n,count)=>n+count*(count-1)/2,0);
 // 인스턴트 라면은 싸고 재료(면)를 서로 재사용해 점수가 부풀었다 — 균형 잡힌 식단에선 드물게만.
 const instant=bases.get('라면')??0;
 // 죽·국수 한 그릇처럼 400kcal도 안 되는 끼니는 한 끼로 부족하다 — 드물게만.
 // 아침은 가볍게 먹으니 400kcal 미만·단백질 적은 메뉴(죽 등)도 감점하지 않는다.
 const isBreakfast=(i:number)=>schedule[i]?.slot==='breakfast';
 const light=ids.filter((id,i)=>{const kcal=products.get(id)?.servingCalories;return !isBreakfast(i)&&typeof kcal==='number'&&kcal<400;}).length;
 // 다 쓰지 못하고 남는 재료값(원). 예산이 남아도 재료를 여러 요리에 나눠 쓰는 식단을 우선하게 한다.
 const waste=rows.waste;
 // 메인 재료가 거의 없는 반찬성 메뉴(무조림·양파볶음·냉국…)는 밥과 곁들여도 한 끼로 허전하다.
 const sideLike=ids.filter((id,i)=>{const g=products.get(id)?.recipe?.nutrition.protein;return !isBreakfast(i)&&typeof g==='number'&&g<15;}).length;
 // 같은 생선·해산물(가자미찜/가자미구이…)이나 달걀 요리(달걀찜/달걀조림…)가 한 식단에 몰리지 않게.
 const seafood=new Map<string,number>();
 for(const id of ids){const name=products.get(id)?.name??'';const key=name.match(SEAFOOD)?.[0]??(/달걀|계란/.test(name)?'달걀':null);if(key)seafood.set(key,(seafood.get(key)??0)+1);}
 const seafoodRepeats=[...seafood.values()].reduce((n,count)=>n+count*(count-1)/2,0);
 // 닭·돼지·소고기처럼 같은 주재료가 한 식단에 몰리지 않게: 7끼마다 같은 고기 2번까지는 괜찮고, 넘으면 크게 감점.
 const meats=new Map<string,number>();
 for(const id of ids){const p=products.get(id);if(p)for(const key of mainIngredients(p))meats.set(key,(meats.get(key)??0)+1);}
 const meatAllowance=Math.max(2,Math.ceil(ids.length*2/7));
 let meatOverflow=[...meats.values()].reduce((n,count)=>n+Math.max(0,count-meatAllowance),0);
 // 같은 시간대(점심끼리·저녁끼리)에서도 한 고기가 몰리지 않게.
 for(const slot of ['breakfast','lunch','dinner'] as MealSlot[]){
  const inSlot=ids.filter((_,i)=>schedule[i]?.slot===slot);if(inSlot.length<3)continue;
  const counts=new Map<string,number>();
  for(const id of inSlot){const p=products.get(id);if(p)for(const key of mainIngredients(p))counts.set(key,(counts.get(key)??0)+1);}
  const allowance=Math.max(1,Math.ceil(inSlot.length*2/7));
  meatOverflow+=[...counts.values()].reduce((n,count)=>n+Math.max(0,count-allowance),0);
 }
 // 아침은 한식(죽·국·계란)과 서양식(토스트·샌드위치·요거트)이 반반쯤 섞이게.
 const breakfastIds=ids.filter((_,i)=>isBreakfast(i));
 const western=breakfastIds.filter(id=>products.get(id)?.recipe?.family==='govdb-western-breakfast').length;
 const breakfastMix=breakfastIds.length>=2?Math.abs(western-breakfastIds.length/2):0;
 // 쑥튀김·옥수수부침처럼 고기·생선·달걀 없이 반죽·기름이 대부분인 튀김·전은 '오늘 메뉴'로 와닿지 않는다.
 const batterOnly=ids.filter(id=>{const p=products.get(id);return !!p?.recipe&&/govdb-(twigim|jeon)$/.test(p.recipe.family)&&!SEAFOOD.test(p.name)&&!MEAT_OR_EGG.test(p.name);}).length;
 const familyRepeats=[...families.values()].reduce((n,count)=>n+count*(count-1)/2,0);
 const feedback=ids.reduce((sum,id)=>{const p=products.get(id)!;return sum+(c.swapPreferences??[]).reduce((n,f)=>n+(
  f.reason==='taste'?(p.id===f.id?1400:mealFamily(p)===f.family?250:0):
  f.reason==='repeat'?(mealFamily(p)===f.family?450:0):
  f.reason==='price'?(p.price/p.servings>=f.price?180:0):
  (p.recipe?.minutes??(p.category==='meal_kit'?20:5))>=f.minutes?250:0),0);},0);
 // The govDB recipe pool's goalBonus values cluster much closer together than the old hand-picked
 // catalog did (every candidate is now a similarly-priced, similarly-"estimated" synthetic recipe),
 // so a raw ±150 cap left goal fit (e.g. 고단백) far too weak to compete with the flat family-diversity
 // and repetition terms below — a 125g-protein dish and a 4g-protein dish differed by only ~50 points,
 // dwarfed by a single extra unique family (+150). Amplifying preserves direction, just restores weight.
 const fit=ids.reduce((n,id)=>n+Math.max(-450,Math.min(480,(products.get(id)?.personalizationScore??0)*3)),0);
 const ingredients=new Map<string,number>();
 for(const id of ids){const recipe=products.get(id)?.recipe;if(recipe&&!recipe.assembly)for(const part of recipe.ingredients)ingredients.set(part.product.id,(ingredients.get(part.product.id)??0)+1);}
 // Prefer reusing a few ingredients across distinct dishes, within existing nutrition and budget constraints.
 const reuse=[...ingredients.values()].reduce((sum,count)=>sum+Math.min(3,count-1)*45,0)-ingredients.size*15;
 // Cooking a dish from real ingredients is preferred over buying an equivalent packaged product,
 // when the two are otherwise close on fit/variety/budget — nudges plans toward recipes rather
 // than defaulting to whichever pre-made item happens to be in the catalog.
 const cooked=ids.filter(id=>products.get(id)?.recipe).length*120;
 return cooked+reuse+rows.length*300-feedback-ids.filter(id=>previous.has(id)).length*900-ids.filter(id=>previousFamilies.has(mealFamily(products.get(id)!))).length*200+families.size*150-repeats*350-familyRepeats*40-baseRepeats*900-instant*400-light*300-sideLike*450-seafoodRepeats*500-batterOnly*500-meatOverflow*600-breakfastMix*350-repetition
  -rows.reduce((n,r)=>n+r.left,0)*100-waste/300-rows.reduce((n,r)=>n+r.cost,0)/c.budget*(c.budgetMode==='save'?2000:c.budgetMode==='full'?-100:100)+fit+(context?contextScore(ids,products,schedule,context):0);
}
// costCache: 메뉴 한 개의 장보기 금액은 끼니와 무관하다 — 끼니마다 다시 계산하면 메뉴가 많을 때 느려진다(21끼 8.6초).
function diverseOptions(products:PlanProduct[],previous:string[],conditions:PlanConditions,limit=80,costCache=new Map<string,number>()){
 if(products.length<=limit)return products;
 const old=new Set(previous);
 const cost=(p:PlanProduct)=>{let v=costCache.get(p.id);if(v===undefined){v=purchaseBasket([p.id],[p],conditions.owned,conditions.supply,undefined,conditions.people).reduce((sum,r)=>sum+r.cost,0);costCache.set(p.id,v);}return v;};
 const costs=new Map(products.map(p=>[p.id,cost(p)]));
 const byCost=[...products].sort((a,b)=>costs.get(a.id)!-costs.get(b.id)!||a.price/a.servings-b.price/b.servings);
 const groups=new Map<string,PlanProduct[]>();
 for(const p of [...byCost].sort((a,b)=>Number(old.has(a.id))-Number(old.has(b.id)))){
  const key=mealFamily(p);groups.set(key,[...(groups.get(key)??[]),p]);
 }
 const selected=new Map(byCost.slice(0,12).map(p=>[p.id,p]));
 // Retain nutritional fits before the cost/family shortlist is capped at 80.
 for(const p of [...products].sort((a,b)=>(b.personalizationScore??0)-(a.personalizationScore??0)).slice(0,20))selected.set(p.id,p);
 for(let i=0;selected.size<limit;i++){
  let added=false;
  for(const group of groups.values()){if(group[i]){selected.set(group[i].id,group[i]);added=true;}if(selected.size>=limit)break;}
  if(!added)break;
 }
 return [...selected.values()];
}
// 같은 조건이면 늘 같은 식단이 나오던 문제: 추천마다 seed로 메뉴별 점수를 조금(±200) 흔들어 조합을 바꾼다.
// 반찬성 감점(450)·중복 감점보다 작아서 품질 기준은 유지된다. seed가 없으면(테스트·예산 안내) 결정적.
const JITTER=400;
function jitterFor(seed:number){return (id:string)=>{let h=(seed>>>0)^2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return (h%1000)/1000-0.5;};}
export function recommendShopping(products: PlanProduct[], c: PlanConditions, cheapest=false,previousIds:string[]=[],seed?:number,today?:TodayContext|null): string[] | null {
 const context=prepareContext(today,c,products);
 const jitter=seed===undefined?null:jitterFor(seed);
 const pool=productsForGoal(candidates(products,c).filter(p=>!p.recipe||!p.id.includes('--with--')),c.goal);
 // 끼니가 많으면(한 주 세 끼 등) 탐색 폭을 줄인다: 21끼에서 약 7.6초 걸리던 계산을 줄이기 위해.
 const wide=c.meals<=12,beam=wide?80:45,cheapBeam=wide?20:10;
 const costCache=new Map<string,number>();
 const schedule=mealSchedule(c),options=schedule.map((_,i)=>diverseOptions(slotCandidates(pool,c,i),previousIds,c,wide?80:45,costCache));
 if(new Set(pool.map(p=>cookingDishId(p.id))).size<c.meals)return null;
 const previous=new Set(previousIds);
 const previousFamilies=new Set(pool.filter(p=>previous.has(p.id)).map(mealFamily));
 const baseOf=new Map(pool.map(p=>[p.id,dishBase(p)])),wordsOf=new Map(pool.map(p=>[p.id,dishWords(p)]));
 let states: {ids:string[];cost:number;score:number}[]=[{ids:[],cost:0,score:0}];
 for(let i=0;i<c.meals;i++){
  const next=new Map<string,{ids:string[];cost:number;score:number}>();
  for(const state of states)for(const p of options[i]){
   if(state.ids.some(id=>cookingDishId(id)===cookingDishId(p.id)))continue;
   // 같은 음식의 변형(라면_김치·라면_떡…)은 한 식단에 한 번만.
   if(state.ids.some(id=>baseOf.get(id)===baseOf.get(p.id)||wordsOf.get(id)===wordsOf.get(p.id)))continue;
   if(repeatsDailyMain(state.ids,pool,c,i,p))continue;
   const ids=[...state.ids,p.id], rows=basket(ids,pool,c.owned,c.supply,c.people), cost=rows.reduce((n,r)=>n+r.cost,0);
   if(cost>c.budget)continue;
   // Preserve the current day's order and the previous meal when merging states.
   const dayStart=schedule.findIndex(s=>s.day===schedule[i].day);
   const key=JSON.stringify([[...ids].sort(),ids.slice(Math.max(0,dayStart-1))]);
   const score=cheapest?-cost:planScore(ids,rows,c,schedule,previous,previousFamilies,context)+(jitter?ids.reduce((n,id)=>n+jitter(cookingDishId(id))*JITTER,0):0);
   if(!next.has(key)||score>next.get(key)!.score)next.set(key,{ids,cost,score});
  }
  const ranked=[...next.values()].sort((a,b)=>b.score-a.score||a.cost-b.cost);
  // Keep inexpensive paths as well, so early variety cannot exhaust the budget.
  states=[...new Set([...ranked.slice(0,beam),...[...ranked].sort((a,b)=>a.cost-b.cost||b.score-a.score).slice(0,cheapBeam)])];
  if(!states.length)return null;
 }
 return states.sort((a,b)=>b.score-a.score||a.cost-b.cost)[0]?.ids??null;
}
export function swapMeal(ids:string[], index:number, products:PlanProduct[], c:PlanConditions,reason?:SwapReason,today?:TodayContext|null):string[]|null {
 const context=prepareContext(today,c,products);
 const old=products.find(p=>p.id===ids[index]);
 products=productsForGoal(products,c.goal);
 const others=ids.flatMap((id,i)=>{const q=i===index?null:productById(products,id);return q?[q]:[];});
 const options=slotCandidates(products,c,index).filter(p=>!ids.some(id=>cookingDishId(id)===cookingDishId(p.id))&&!others.some(q=>sameDish(q,p))&&!repeatsDailyMain(ids,products,c,index,p)).filter(p=>!old||!reason||(
  reason==='price'?basketTotal(ids.map((id,i)=>i===index?p.id:id),products,c.owned,c.supply,c.people)<basketTotal(ids,products,c.owned,c.supply,c.people):
  reason==='effort'?(p.recipe?.minutes??(p.category==='meal_kit'?20:5))<(old.recipe?.minutes??(old.category==='meal_kit'?20:5)):
  reason==='repeat'?mealFamily(p)!==mealFamily(old):true
 )).map(p=>ids.map((id,i)=>i===index?p.id:id)).filter(next=>basketTotal(next,products,c.owned,c.supply,c.people)<=c.budget);
 const schedule=mealSchedule(c);
 options.sort((a,b)=>planScore(b,basket(b,products,c.owned,c.supply,c.people),c,schedule,undefined,undefined,context)-planScore(a,basket(a,products,c.owned,c.supply,c.people),c,schedule,undefined,undefined,context));
 return options[0]??null;
}
// Browsable candidates for one slot, so the UI can let people pick instead of only accepting a single auto-swap.
export function alternativesFor(products:PlanProduct[], ids:string[], c:PlanConditions, index:number, limit=6):PlanProduct[] {
 const current=ids[index]?cookingDishId(ids[index]):null;
 return productsForGoal(slotCandidates(products,c,index),c.goal)
  .filter(p=>cookingDishId(p.id)!==current)
  .filter(p=>!ids.some((id,i)=>i!==index&&cookingDishId(id)===cookingDishId(p.id)))
  .filter(p=>!repeatsDailyMain(ids,products,c,index,p))
  .sort((a,b)=>(b.personalizationScore??0)-(a.personalizationScore??0)||a.price/a.servings-b.price/b.servings)
  .slice(0,limit);
}
