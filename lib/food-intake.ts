import type {PlanProduct} from './shopping-plan';
import type {ShoppingStock,StockItem} from './shopping-progress';

export function servingNutrition(p:PlanProduct){
 if(p.recipe)return p.recipe.nutrition;
 const basis=p.nutritionBasis?.replaceAll(' ','').match(/^(?:가식부)?(\d+(?:\.\d+)?)g(?:당|기준)?$/);
 const grams=p.servingGrams??(p.unit==='g'&&p.servings>0?p.quantity/p.servings:null);
 const factor=basis&&Number(basis[1])>0&&grams!==null&&grams>0?grams/Number(basis[1]):null;
 const sourced=Boolean(p.nutritionSourceUrl||p.nutritionPhotoUrl);
 const value=(n:number|null)=>sourced&&factor!==null&&n!==null&&Number.isFinite(n)&&n>=0?Math.round(n*factor*1000)/1000:null;
 return {calories:value(p.caloriesKcal),protein:value(p.proteinG)};
}
export const stockPrecision=(n:number)=>Math.abs(n)<0.0000011?0:Math.round(n*1000000)/1000000;
export function validStockQuantity(n:unknown):n is number{return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10000000&&Math.abs(n*1000000-Math.round(n*1000000))<0.01;}
export function validPortions(n:unknown):n is number{return typeof n==='number'&&n>=0.25&&n<=10&&Number.isInteger(n*4);}
export type IntakeLog={id:string;productId:string;name:string;portions:number;packs:number;calories:number|null;protein:number|null;cost?:number|null;createdAt:string};
export type IntakeProduct={id:string;name:string;servingNote:string;servings:number;available:number;calories:number|null;protein:number|null;image:string|null};
export type IntakeData={date:string;version:number;products:IntakeProduct[];logs:IntakeLog[]};
export function consumeFood(stock:ShoppingStock,p:PlanProduct,portions:number){
 if(!validPortions(portions)||!Number.isFinite(p.servings)||p.servings<=0)throw new Error('먹은 양을 확인해 주세요.');
 if(p.recipe){
  let next=stock;const consumed:{item:StockItem;packs:number}[]=[];
  for(const part of p.recipe.ingredients){
   const packs=stockPrecision(part.packs*portions),item=next[part.product.id];
   if(!item||item.unit!=='묶음'||item.owned+0.000001<packs)throw new Error(`${part.product.name} 보유 수량이 부족해요. 재료의 구매·보유 상태를 확인해 주세요.`);
   consumed.push({item:{...item},packs});next={...next,[item.id]:{...item,owned:stockPrecision(item.owned-packs)}};
  }
  const n=servingNutrition(p);
  return {stock:next,packs:portions,snapshot:{kind:'recipe' as const,ingredients:consumed},calories:n.calories===null?null:Math.round(n.calories*portions*10)/10,protein:n.protein===null?null:Math.round(n.protein*portions*10)/10};
 }
 const item=stock[p.id],packs=Math.round(portions/p.servings*1000000)/1000000;
 if(!item||item.unit!=='묶음'||item.owned+0.000001<packs)throw new Error('보유 수량이 부족해요. 구매한 음식과 먹은 양을 확인해 주세요.');
 const nutrition=servingNutrition(p);
 return {stock:{...stock,[p.id]:{...item,owned:stockPrecision(item.owned-packs)}},packs,snapshot:item,
  calories:nutrition.calories===null?null:Math.round(nutrition.calories*portions*10)/10,
  protein:nutrition.protein===null?null:Math.round(nutrition.protein*portions*10)/10};
}
export function restoreFood(stock:ShoppingStock,item:StockItem,packs:number):ShoppingStock {
 const current=stock[item.id]??{...item,ordered:0,owned:0};
 if(current.unit!==item.unit)throw new Error('보유 재료 단위가 바뀌었어요. 수량을 먼저 확인해 주세요.');
 const owned=stockPrecision(current.owned+packs);
 if(!validStockQuantity(owned))throw new Error('보유 수량을 복원할 수 없어요.');
 return {...stock,[item.id]:{...current,owned}};
}
export function intakeTotals(logs:IntakeLog[]){return {
 calories:Math.round(logs.reduce((n,l)=>n+(l.calories??0),0)*10)/10,
 protein:Math.round(logs.reduce((n,l)=>n+(l.protein??0),0)*10)/10,
 missingCalories:logs.filter(l=>l.calories===null).length,
 missingProtein:logs.filter(l=>l.protein===null).length,
};}

export function availablePortions(stock:ShoppingStock,p:PlanProduct){
 const parts=p.recipe?.ingredients??[{product:p,packs:1/p.servings}];
 return stockPrecision(Math.min(...parts.map(part=>stock[part.product.id]?.unit==='묶음'?(stock[part.product.id].owned/part.packs):0)));
}
export function restoreConsumption(stock:ShoppingStock,snapshot:StockItem|{kind:'recipe';ingredients:{item:StockItem;packs:number}[]},packs:number):ShoppingStock{
 if('kind' in snapshot&&snapshot.kind==='recipe')return snapshot.ingredients.reduce((next,part)=>restoreFood(next,part.item,part.packs),stock);
 return restoreFood(stock,snapshot as StockItem,packs);
}
