import recipeData from '../data/cooking-recipes.json';
import alternatives from '../data/cooking-ingredient-alternatives.json';
import type {CatalogItem} from './catalog';
import type {PlanProduct,MealSlot} from './shopping-plan';
import {cookingIngredientPool,type IngredientRole} from './cooking-ingredient-pool';
import {servingNutrients} from './serving-nutrients';

// Quantities are recipe portions, not extra catalog products or live price quotes.
// Only these known selling configurations can be used; changed packs fail closed.
const contracts=Object.fromEntries(Object.entries(recipeData.contracts).map(([id,c])=>[id,{...c,match:new RegExp(c.match)}]));
type Recipe={id:string;name:string;emoji:string;family:string;minutes:number;slots:MealSlot[];parts:[string,number,string][];steps:string[]};
const recipes:Recipe[]=recipeData.recipes.map(r=>({...r,slots:r.slots as MealSlot[],parts:r.parts.map(([id,packs,label])=>[String(id),Number(packs),String(label)])}));
// Template slots represent required amounts, never synthetic purchasable products.
const extraTargets:Record<string,{role:IngredientRole;amount:number}>={
 'slot-pork':{role:'rawPork',amount:150},'slot-beef':{role:'rawBeef',amount:150},'slot-fish':{role:'fish',amount:150},'slot-chicken':{role:'rawChicken',amount:150},'slot-potato':{role:'potato',amount:150},'slot-zucchini':{role:'zucchini',amount:100},
};
const extraRecipes:Recipe[]=[
 {id:'cook-pork-cabbage',name:'돼지고기 양배추볶음과 밥',emoji:'🍚',family:'pork-stirfry',minutes:20,slots:['lunch','dinner'],parts:[['rice',1,'밥'],['slot-pork',1,'돼지고기'],['kurly-1001897355',.2,'양배추'],['kurly-5152797',.25,'양파']],steps:['채소를 씻어 썰고 생고기는 채소와 분리해 준비해요.','팬에 돼지고기와 물을 조금 넣어 익힌 뒤 채소를 넣고 고기 속까지 충분히 익혀요.','데운 밥과 함께 담아요. 간장·소금·식용유는 기호에 따라 별도 준비해요.']},
 {id:'cook-beef-mushroom-steam',name:'소고기 버섯찜과 밥',emoji:'🍲',family:'beef-steam',minutes:25,slots:['lunch','dinner'],parts:[['rice',1,'밥'],['slot-beef',1,'소고기'],['kurly-5031392',.5,'버섯'],['kurly-5152797',.25,'양파']],steps:['채소를 씻어 썰고 냄비 바닥에 담아요.','불고기용 생소고기를 펼쳐 올리고 물을 조금 넣어 뚜껑을 덮고 속까지 충분히 익혀요.','데운 밥을 곁들여요. 찍어 먹을 간장 등은 별도 준비해요.']},
 {id:'cook-fish-cabbage',name:'생선구이와 양배추 밥상',emoji:'🐟',family:'fish-grill',minutes:25,slots:['lunch','dinner'],parts:[['rice',1,'밥'],['slot-fish',1,'생선'],['kurly-1001897355',.2,'양배추']],steps:['생선은 제품 표시대로 해동하고 포장의 구이 조리법을 따라 속까지 익혀요.','양배추는 씻어 찜기에 충분히 익혀요.','생선의 잔가시를 확인하고 데운 밥과 채소를 곁들여요.']},
 {id:'cook-chicken-potato',name:'닭가슴살 감자찜과 밥',emoji:'🥔',family:'chicken-steam',minutes:30,slots:['lunch','dinner'],parts:[['rice',.5,'밥'],['slot-chicken',1,'생닭가슴살'],['slot-potato',1,'감자'],['kurly-5152797',.25,'양파']],steps:['감자를 씻고 껍질을 벗겨 작게 썰어요. 생닭은 채소와 도마·도구를 분리해 준비해요.','냄비에 감자·양파·닭과 물을 넣고 감자가 부드러워지고 닭 속까지 완전히 익도록 끓여요.','데운 밥을 곁들여요. 간은 기호에 따라 별도로 해요.']},
 {id:'cook-zucchini-egg',name:'애호박 달걀 덮밥',emoji:'🍳',family:'zucchini-egg',minutes:15,slots:['lunch','dinner'],parts:[['rice',1,'밥'],['slot-zucchini',1,'애호박'],['eggs',.1,'달걀']],steps:['씻은 애호박을 얇게 썰어 팬에 물을 조금 넣고 익혀요.','달걀을 풀어 넣고 저으며 완전히 익혀요.','데운 밥 위에 올려요. 소금 등 양념은 선택 사항이에요.']},
];
function nutrients(p:CatalogItem,packs:number,grams:number){
 if(grams<=0)return {calories:null,protein:null};
 const n=servingNutrients({...p,servings:1,servingGrams:grams*packs,servingNote:'요리 사용량',avoidanceText:null});
 return {calories:n.calories,protein:n.protein};
}
export function cookingProducts(catalog:CatalogItem[]):PlanProduct[]{
 const pool=cookingIngredientPool(catalog);
 const roles:Record<string,IngredientRole>={rice:'rice',tofu:'tofu',eggs:'eggs',chicken:'chicken','kurly-5036690':'vegetables','kurly-5104165':'beef','kurly-1000315118':'pork','kurly-1002274835':'belly','kurly-5152797':'onion','kurly-5031392':'mushroom','kurly-1001897355':'cabbage'};
 const dynamicContracts:Record<string,{unit:string;quantity:number;grams:number;match:RegExp}>={};
 const dynamic=[...recipes,...extraRecipes].flatMap(recipe=>{
  const choices=recipe.parts.map(([id,packs])=>{
   const role=extraTargets[id]?.role??roles[id];if(!role)return [];
   const amount=packs*(extraTargets[id]?.amount??(role==='eggs'?contracts[id].quantity:contracts[id].grams));
   // Retain both low checkout prices and low unit prices, so large packs cannot crowd out small baskets.
   const group=pool[role];const options=[...new Map([...group.slice(0,4),...[...group].sort((a,b)=>a.product.price-b.product.price||a.product.id.localeCompare(b.product.id)).slice(0,4)].map(o=>[o.product.id,o])).values()];
   return options.map(({product:p,amount:packAmount})=>{
    dynamicContracts[p.id]={unit:p.unit,quantity:p.quantity,grams:role==='eggs'?0:packAmount,match:new RegExp(`^${p.detail.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)};
    return [p.id,amount/packAmount,`${p.name} ${Number(amount.toFixed(1))}${role==='eggs'?'개':'g'}`] as [string,number,string];
   });
  });
  if(choices.some(c=>!c.length))return [];
  // Bound combinations: a cheap shared base plus every shortlisted single-ingredient substitution.
  const base=choices.map(c=>c[0]);const combinations=[base,...choices.flatMap((options,i)=>options.slice(1).map(option=>base.map((part,j)=>j===i?option:part)))];
  return combinations.map(parts=>({...recipe,id:`${recipe.id}--auto--${parts.map(p=>p[0]).join('~')}`,parts}));
 });
 const variants=recipes.flatMap(recipe=>alternatives.groups.reduce<Recipe[]>((choices,group)=>choices.flatMap(r=>{
  const part=r.parts.find(([id])=>id===group.baseId);if(!part)return [r];
  return [r,...group.offers.flatMap(offer=>{
   const p=catalog.find(p=>p.id===offer.id);
   if(!p||p.name!==offer.name||p.detail!==offer.detail||p.unit!==offer.unit||p.quantity!==offer.quantity||p.productUrl!==offer.sourceUrl||p.market!=='KR'||p.currency!=='KRW'||!p.priceCheckedAt||!Number.isFinite(Date.parse(p.priceCheckedAt)))return [];
   const ratio=group.baseId==='eggs'?contracts[group.baseId].quantity/offer.quantity:contracts[group.baseId].grams/offer.grams;
   if(!Number.isFinite(ratio)||ratio<=0)return [];
   return [{...r,id:`${r.id}--with--${offer.id}`,parts:r.parts.map(([id,packs,label]):[string,number,string]=>id===group.baseId?[offer.id,packs*ratio,label]:[id,packs,label]),steps:[...r.steps,group.note]}];
  })];
 }),[recipe]));
 const offerContracts=Object.fromEntries(alternatives.groups.flatMap(g=>g.offers.map(o=>[o.id,{...o,match:new RegExp(`^${o.detail.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)}])));
 return [...variants,...dynamic].flatMap(r=>{
  const parts=r.parts.map(([id,packs,label])=>{
   const p=catalog.find(p=>p.id===id),contract=r.id.includes('--auto--')?dynamicContracts[id]:contracts[id]??offerContracts[id];
   if(!p||p.unit!==contract.unit||p.quantity!==contract.quantity||!contract.match.test(p.detail)||!p.productUrl||p.price<=0)return null;
   const product:PlanProduct={...p,servings:1,servingGrams:contract.grams||undefined,servingNote:'판매 1묶음',avoidanceText:p.allergyInfo?.status==='unknown'||!p.allergyInfo?null:`${p.name} ${p.allergyInfo.statement}`};
   return {product,packs,label,nutrition:nutrients(p,packs,contract.grams)};
  });
  if(parts.some(p=>p===null))return [];
  const ingredients=parts.filter(p=>p!==null);
  const sum=(key:'calories'|'protein')=>ingredients.some(i=>i.nutrition[key]===null)?null:Math.round(ingredients.reduce((s,i)=>s+i.nutrition[key]!,0)*10)/10;
  const base=ingredients[0].product;
  return [{...base,id:r.id,name:r.name,emoji:r.emoji,category:'other' as const,productUrl:null,productImageUrl:null,
   detail:'재료를 직접 준비하는 1인분 · 양념 추가 시 비용·영양 별도',price:Math.round(ingredients.reduce((sum,p)=>sum+p.product.price*p.packs,0)),quantity:1,unit:'개' as const,servings:1,servingGrams:undefined,
   servingNote:'레시피 1인분 · 재료별 등록 영양 합산 예상',avoidanceText:ingredients.some(i=>i.product.avoidanceText===null)?null:ingredients.map(p=>`${p.label} ${p.product.avoidanceText} ${(p.product.allergens??[]).join(' ')}`).join(' '),
   allergens:[...new Set(ingredients.flatMap(p=>p.product.allergens??[]))],allergyInfo:null,nutritionSourceName:null,nutritionSourceUrl:null,nutritionPhotoUrl:null,nutritionBasis:null,caloriesKcal:null,proteinG:null,carbohydratesG:null,fatG:null,sodiumMg:null,protein:'재료 합산 예상',
   recipe:{minutes:r.minutes,slots:r.slots,family:r.family,steps:r.steps,ingredients:ingredients.map(({product,packs,label})=>({product,packs,label})),nutrition:{calories:sum('calories'),protein:sum('protein')}}}];
 });
}
export function comparisonFamily(p:PlanProduct){return p.recipe?.family??(/죽/.test(p.name)?'porridge':/밥|도시락/.test(p.name)?'rice':null);}
export function matchesCookingAlternative(a:PlanProduct,b:PlanProduct){
 const recipe=a.recipe?a:b,ready=a.recipe?b:a;
 if(!recipe.recipe||ready.recipe||comparisonFamily(recipe)!==comparisonFamily(ready))return false;
 const groups=[/소고기|쇠고기|한우|비프/,/돼지|삼겹|베이컨|햄|잠봉|제육/,/새우|게살|전복|연어|참치|명란|오징어/,/호박/,/닭|치킨/,/달걀|계란|에그/,/두부/];
 const mentioned=groups.filter(pattern=>pattern.test(ready.name));
 // Sharing a meal type alone is not enough: beef porridge must not become chicken porridge.
 return mentioned.length>0&&mentioned.every(pattern=>pattern.test(recipe.name));
}
