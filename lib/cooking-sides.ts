import type {CatalogItem} from './catalog';
import type {PlanProduct} from './shopping-plan';
import {cookingIngredientPool,type IngredientRole} from './cooking-ingredient-pool';
import {servingNutrients} from './serving-nutrients';

// One-person edible weights; optional seasonings are not included.
const recipes:{role:IngredientRole;name:string;grams:number;minutes:number;steps:string[]}[]=[
 {role:'cabbage',name:'양배추찜',grams:80,minutes:10,steps:['양배추를 씻어 한입 크기로 썰어요.','찜기에 넣고 부드러워질 때까지 약 7~10분 쪄요.']},
 {role:'mushroom',name:'표고버섯 물볶음',grams:60,minutes:10,steps:['표고버섯의 밑동을 정리하고 얇게 썰어요.','팬에 물을 조금씩 넣으며 약 5~7분 충분히 익혀요.']},
 {role:'zucchini',name:'애호박찜',grams:80,minutes:10,steps:['애호박을 씻고 얇게 썰어요.','찜기에 넣어 약 5~8분 부드럽게 익혀요.']},
];
export function withCookingSides(meals:PlanProduct[],catalog:CatalogItem[]):PlanProduct[]{
 const pool=cookingIngredientPool(catalog);
 const sides=recipes.flatMap(r=>{
  const options=pool[r.role].map(({product,amount})=>{
   const p:PlanProduct={...product,servings:1,servingGrams:amount,servingNote:'판매 1묶음',avoidanceText:product.allergyInfo?.status==='unknown'||!product.allergyInfo?null:`${product.name} ${product.allergyInfo.statement}`};
   const n=servingNutrients(p);return {r,p,packs:r.grams/amount,complete:Object.values(n).every(v=>v!==null)};
  }).sort((a,b)=>Number(b.complete)-Number(a.complete)||a.p.price*a.packs-b.p.price*b.packs);
  return options.length?[options[0]]:[];
 });
 return meals.flatMap(main=>{
  if(!main.recipe||main.recipe.assembly)return [main];
  const recipe=main.recipe;
  const choices=[...sides].sort((a,b)=>Number(recipe.ingredients.some(i=>i.product.id===a.p.id))-Number(recipe.ingredients.some(i=>i.product.id===b.p.id)));
  return [main,...[1,2].flatMap(count=>{
   if(choices.length<count)return [];
   const selected=choices.slice(0,count);
   const parts=[...recipe.ingredients.map(i=>({...i})),...selected.map(s=>({product:s.p,packs:s.packs,label:`${s.r.name}용 ${s.p.name} ${s.r.grams}g`}))];
   const combined=new Map<string,typeof parts[number]>();
   for(const part of parts){const old=combined.get(part.product.id);if(old){old.packs+=part.packs;old.label+=` + ${part.label}`;}else combined.set(part.product.id,{...part});}
   const ingredients=[...combined.values()];
   const nutrients=ingredients.map(i=>({n:servingNutrients(i.product),factor:i.product.servings*i.packs}));
   const sum=(key:'calories'|'protein')=>nutrients.every(i=>i.n[key]!==null)?Math.round(nutrients.reduce((n,i)=>n+i.n[key]!*i.factor,0)*10)/10:null;
   return [{...main,id:`${main.id}--sides-${count}`,name:`${main.name} + ${selected.map(s=>s.r.name).join('·')}`,
    price:Math.round(ingredients.reduce((n,i)=>n+i.product.price*i.packs,0)),
    avoidanceText:ingredients.some(i=>i.product.avoidanceText===null)?null:ingredients.map(i=>`${i.product.name} ${i.product.avoidanceText}`).join(' '),
    allergens:[...new Set(ingredients.flatMap(i=>i.product.allergens??[]))],
    recipe:{...recipe,sideCount:count,sides:selected.map(s=>({name:s.r.name,steps:s.r.steps,minutes:s.r.minutes})),minutes:recipe.minutes+selected.reduce((n,s)=>n+s.r.minutes,0),ingredients,nutrition:{calories:sum('calories'),protein:sum('protein')},steps:[...recipe.steps,...selected.flatMap(s=>s.r.steps.map(step=>`${s.r.name}: ${step}`))]}}];
  })];
 });
}
