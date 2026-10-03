import {canonicalIngredient,isWater,PANTRY} from './ingredient-canonical';
import type {PlanProduct} from './shopping-plan';

export const pantryStaples=['소금','후추','식용유','간장','설탕','참기름','고추장','고춧가루','식초','마늘'];
export const basicPantryStaples=['소금','후추','식용유','간장'];
export const isPantrySeasoning=(name:string)=>PANTRY.has(name)||pantryStaples.includes(name);
// Only small aromatics in rice dishes can be skipped; never omit a named or primary ingredient.
export function pantryOptionalIngredients(product:PlanProduct,owned:string[]){
 if(product.sourceRecipe)return product.sourceRecipe.ingredients.filter(i=>i.optional).map(i=>canonicalIngredient(i.name)||i.name);
 if(!/볶음밥|덮밥/.test(product.name)||/양파|대파|쪽파|파덮밥|파볶음밥/.test(product.name))return [];
 const available=new Set(owned.map(canonicalIngredient));
 return [...new Set((product.recipe?.ingredients??[]).filter(item=>{
  const name=canonicalIngredient(item.product.name);
  if(!['파','양파'].includes(name)||available.has(name))return false;
  const grams=item.label.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*g(?:\s|$)/i);
  return grams!==null&&Number(grams[1])>0&&Number(grams[1])<=40;
 }).map(item=>canonicalIngredient(item.product.name)))];
}
export function pantryCookingStyle(p:PlanProduct){
 const name=p.name;
 if(/볶음밥/.test(name))return '볶음밥';if(/덮밥/.test(name))return '덮밥';
 if(/국|탕|찌개/.test(name))return '국·찌개';if(/샐러드|무침/.test(name))return '샐러드·무침';
 if(/전$|부침|오믈렛|스크램블|계란말이/.test(name))return '달걀·부침';
 if(/면|국수|파스타/.test(name))return '면';return p.recipe?.family??name;
}
export function pantryShortage(product:PlanProduct,owned:string[]){
 const missing=missingPantryIngredients(product,owned);
 return {main:missing.filter(n=>!isPantrySeasoning(n)),seasonings:missing.filter(isPantrySeasoning)};
}
export function missingPantryIngredients(product:PlanProduct,owned:string[]){
 const available=new Set(owned.map(canonicalIngredient));
 const optional=new Set(pantryOptionalIngredients(product,owned));
 return [...new Set((product.recipe?.ingredients??[]).map(i=>canonicalIngredient(i.product.name)).filter(n=>n&&!isWater(n)&&!available.has(n)&&!optional.has(n)))];
}
// Rank only already eligible recipes. Never relax exclusions or cooking constraints.
export function pantryCandidates(products:PlanProduct[],owned:string[],previous:string[]=[],priority:string[]=[],allowShopping=true){
 const recipes=products.filter(p=>p.recipe?.ingredients.length&&(allowShopping||missingPantryIngredients(p,owned).length===0));
 const missing=new Map(recipes.map(p=>[p.id,pantryShortage(p,owned)]));
 const minimum=Math.min(...recipes.map(p=>missing.get(p.id)!.main.length));
 // Keep alternatives close to the best match; never drift into recipes unrelated to the pantry.
 const available=new Set(owned.map(canonicalIngredient));
 const near=recipes.filter(p=>missing.get(p.id)!.main.length<=minimum+1&&p.recipe?.ingredients.some(i=>available.has(canonicalIngredient(i.product.name))&&!isPantrySeasoning(canonicalIngredient(i.product.name))));
 // Avoid extra shopping just to offer an unseen dish. Variety breaks ties only.
 const pool=near.length?near:recipes;
 const bestMain=Math.min(...pool.map(p=>missing.get(p.id)!.main.length));
 const closest=pool.filter(p=>missing.get(p.id)!.main.length===bestMain);
 const score=(p:PlanProduct)=>{const names=new Set(p.recipe?.ingredients.map(i=>canonicalIngredient(i.product.name)));return priority.reduce((sum,name,index)=>sum+(names.has(canonicalIngredient(name))?priority.length-index:0),0);};
 const best=Math.max(0,...closest.map(score));
 const preferred=closest.filter(p=>score(p)===best);
 const leastSeasonings=Math.min(...preferred.map(p=>missing.get(p.id)!.seasonings.length));
 const feasible=preferred.filter(p=>missing.get(p.id)!.seasonings.length===leastSeasonings);
 const unseen=feasible.filter(p=>!previous.includes(p.id));
 return unseen.length?unseen:feasible;
}
