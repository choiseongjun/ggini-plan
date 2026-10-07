// 홈 첫 화면 "냉장고에 있는 거 누르면, 오늘 해 먹을 한 끼를 정해 줘요".
// 실제 자취 레시피(출처 영상이 있는 pantry source recipes)에서, 더 살 게 0~1개이고 누른 재료를 많이 쓰는 메뉴를 먼저 고른다.
// 기본 양념(간장·설탕·식용유…)과 고명(청양고추·통깨·김가루…)은 집에 있다고 보거나 없어도 되는 재료로 본다.
import {pantrySourceProducts} from './pantry-source-recommendations';
import {pantryShortage} from './pantry-recommendation';
import {canonicalIngredient} from './ingredient-canonical';
import {servingNutrition} from './food-intake';
import {servingNutrients} from './serving-nutrients';

// 칩 하나가 레시피의 여러 표기와 맞도록 묶는다(햄 ↔ 통조림햄, 참치캔 ↔ 참치통조림 …).
export const FRIDGE_CHIPS=[
 {key:'egg',label:'달걀',emoji:'🥚',aliases:['달걀']},
 {key:'kimchi',label:'김치',emoji:'🥬',aliases:['김치']},
 {key:'rice',label:'밥',emoji:'🍚',aliases:['밥']},
 {key:'scallion',label:'대파',emoji:'🌿',aliases:['대파','쪽파']},
 {key:'onion',label:'양파',emoji:'🧅',aliases:['양파']},
 {key:'tofu',label:'두부',emoji:'🧈',aliases:['두부','순두부']},
 {key:'ham',label:'햄·스팸',emoji:'🥓',aliases:['햄','통조림햄','스팸']},
 {key:'tuna',label:'참치캔',emoji:'🥫',aliases:['참치','참치통조림','참치캔']},
 {key:'potato',label:'감자',emoji:'🥔',aliases:['감자']},
 {key:'sausage',label:'소시지',emoji:'🌭',aliases:['소시지']},
 {key:'ramen',label:'라면',emoji:'🍜',aliases:['라면']},
 {key:'fishcake',label:'어묵',emoji:'🍢',aliases:['어묵','사각어묵','봉어묵']},
 {key:'zucchini',label:'애호박',emoji:'🥒',aliases:['애호박']},
 {key:'pork',label:'돼지고기',emoji:'🥩',aliases:['돼지고기','삼겹살','간돼지고기']},
 {key:'beef',label:'소고기',emoji:'🥩',aliases:['소고기']},
 {key:'mushroom',label:'버섯',emoji:'🍄',aliases:['버섯','느타리버섯','팽이버섯','새송이버섯']},
 {key:'carrot',label:'당근',emoji:'🥕',aliases:['당근']},
 {key:'tomato',label:'토마토',emoji:'🍅',aliases:['토마토']},
] as const;
// 처음에는 자취 냉장고에 가장 흔한 것만 보여 주고 나머지는 '더 보기'로 연다.
export const FRIDGE_COMMON=8;
export type FridgeChip=typeof FRIDGE_CHIPS[number]['key'];
export const isFridgeChip=(value:unknown):value is FridgeChip=>FRIDGE_CHIPS.some(chip=>chip.key===value);

// 없어도 만들 수 있거나 대부분 집에 있는 것: "더 살 것"으로 세지 않는다.
const ASSUMED=new Set(['소시지','청양고추','홍고추','꽈리고추','쪽파','통깨','깨소금','깨','김가루','물엿','올리고당','전분가루','부침가루','밀가루','새우젓','생강','액젓','멸치액젓','육수용멸치','훈연멸치가루','건새우','후춧가루','msg'].map(name=>canonicalIngredient(name)));

export type FridgePick={id:string;name:string;uses:string[];missing:string[];kcal:number|null;nutrition:{calories:number|null;protein:number|null;carbs:number|null;fat:number|null;sodium:number|null}};

export function fridgePicks(chips:FridgeChip[],skip:string[]=[],limit=5):FridgePick[]{
 const chosen=FRIDGE_CHIPS.filter(chip=>chips.includes(chip.key));
 const owned=chosen.flatMap(chip=>[...chip.aliases]);
 const labelOf=new Map<string,string>(chosen.flatMap(chip=>chip.aliases.map(alias=>[canonicalIngredient(alias),chip.label] as [string,string])));
 const rows=pantrySourceProducts().filter(p=>p.recipe?.ingredients.length&&!skip.includes(p.id)).map(p=>{
  const missing=pantryShortage(p,owned).main.filter(name=>!ASSUMED.has(name));
  const uses=[...new Set(p.recipe!.ingredients.map(i=>labelOf.get(canonicalIngredient(i.product.name))).filter((label):label is string=>Boolean(label)))];
  return {p,missing,uses};
 });
 // 단계: 누른 재료를 쓰고 더 살 게 1개 이하 → 누른 재료를 쓰고 2개 → 안 쓰지만 1개 이하 → 나머지.
 // 같은 단계에서는 누른 재료를 많이 쓰는 순, 더 살 게 적은 순.
 const tier=(r:{uses:string[];missing:string[]})=>r.uses.length&&r.missing.length<=1?0:r.uses.length&&r.missing.length<=2?1:r.missing.length<=1?2:3;
 rows.sort((a,b)=>tier(a)-tier(b)||b.uses.length-a.uses.length||a.missing.length-b.missing.length||a.p.name.localeCompare(b.p.name,'ko'));
 return rows.slice(0,limit).map(({p,missing,uses})=>{
  const basic=servingNutrition(p),more=servingNutrients(p);
  return {id:p.id,name:p.name,uses,missing:missing.map(name=>name==='파'?'대파':name),kcal:basic.calories===null?null:Math.round(basic.calories),
   nutrition:{calories:basic.calories,protein:basic.protein,carbs:more.carbs,fat:more.fat,sodium:more.sodium}};
 });
}

// 결과 카드의 한 줄: "더 살 거 없음!" / "대파 하나만 사면 돼요" / "대파·소시지만 더 있으면 돼요"
export function shoppingLine(missing:string[]){
 if(!missing.length)return '더 살 거 없음!';
 if(missing.length===1)return `${missing[0]} 하나만 사면 돼요`;
 return `${missing.slice(0,3).join('·')}만 더 있으면 돼요`;
}
