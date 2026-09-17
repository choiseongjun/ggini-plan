import recipeData from '../data/cooking-recipes.json';
import alternatives from '../data/cooking-ingredient-alternatives.json';
import type {CatalogItem} from './catalog';
import type {PlanProduct,MealSlot} from './shopping-plan';

// Quantities are recipe portions, not extra catalog products or live price quotes.
// Only these known selling configurations can be used; changed packs fail closed.
const contracts=Object.fromEntries(Object.entries(recipeData.contracts).map(([id,c])=>[id,{...c,match:new RegExp(c.match)}]));
type Recipe={id:string;name:string;emoji:string;family:string;minutes:number;slots:MealSlot[];parts:[string,number,string][];steps:string[]};
const recipes:Recipe[]=recipeData.recipes.map(r=>({...r,slots:r.slots as MealSlot[],parts:r.parts.map(([id,packs,label])=>[String(id),Number(packs),String(label)])}));
function nutrients(p:CatalogItem,packs:number,grams:number){
 if(!p.nutritionSourceUrl&&!p.nutritionPhotoUrl)return {calories:null,protein:null};
 // These reviewed formats express either grams per label or total package.
 const basis=p.nutritionBasis??'';
 const match=basis.match(/(\d+(?:\.\d+)?)g/);
 const factor=match&&Number(match[1])>0&&grams>0?grams*packs/Number(match[1]):null;
 return {calories:factor!==null&&p.caloriesKcal!==null?p.caloriesKcal*factor:null,protein:factor!==null&&p.proteinG!==null?p.proteinG*factor:null};
}
export function cookingProducts(catalog:CatalogItem[]):PlanProduct[]{
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
 return variants.flatMap(r=>{
  const parts=r.parts.map(([id,packs,label])=>{
   const p=catalog.find(p=>p.id===id),contract=contracts[id]??offerContracts[id];
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
