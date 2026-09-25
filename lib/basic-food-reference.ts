import type {FoodReference} from './food-reference';
export function manualFoodReference(code:string):FoodReference|null{
 if(!code.startsWith('manual:'))return null;
 const name=code.slice(7).trim();
 if(!name||name.length>40||/[\x00-\x1f\x7f]/.test(name))return null;
 return {code:`manual:${name}`,name,brand:null,category:'직접 입력 · 영양 미확인',servingAmount:1,servingUnit:'회',kcal:null,protein:null,carbs:null,sugar:null,fat:null,sodium:null};
}
export type RawFoodRow={food_code:string;item_name:string;category_large:string|null;basis_amount:string;calories_kcal:string|null;protein_g:string|null;carbohydrates_g:string|null;sugar_g:string|null;fat_g:string|null;sodium_mg:string|null};
export function rawFoodReference(row:RawFoodRow):FoodReference|null{
 const basis=row.basis_amount.match(/^\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*$/i);
 if(!basis||Number(basis[1])<=0)return null;
 const parts=row.item_name.split('_');
 const name=parts.length===2&&parts[1]==='생것'?parts[0]:parts.join(' · ');
 const number=(v:string|null)=>v!==null&&Number.isFinite(Number(v))?Number(v):null;
 return {code:`raw:${row.food_code}`,name,brand:null,category:row.item_name.endsWith('_생것')?'기본 식품 · 생것':row.category_large,servingAmount:Number(basis[1]),servingUnit:basis[2].toLowerCase()==='g'?'g':'mL',kcal:number(row.calories_kcal),protein:number(row.protein_g),carbs:number(row.carbohydrates_g),sugar:number(row.sugar_g),fat:number(row.fat_g),sodium:number(row.sodium_mg)};
}
const normalize=(v:string)=>v.toLowerCase().replace(/[\s_()·,.\-\[\]]/g,'');
export function rankFoodReferences(items:FoodReference[],query:string,limit:number){
 const key=normalize(query);
 const rank=(f:FoodReference)=>{const name=normalize(f.name);return (name===key?0:name.startsWith(key+'생것')?1:name.startsWith(key)?2:name.includes(key)?3:4)*10000+(f.brand?500:0)+name.length;};
 return items.sort((a,b)=>rank(a)-rank(b)||a.code.localeCompare(b.code)).slice(0,limit);
}
