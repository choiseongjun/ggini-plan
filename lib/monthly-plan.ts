import {recommendMeals, type DietPreferences} from './meal-plan';
import type {BodyProfile} from './body-profile';
import type {CatalogItem} from './catalog';
export type DayPlan={date:string;recommendation:NonNullable<ReturnType<typeof recommendMeals>> & {scheduleVersion?:number}};
export function validMonth(value:unknown):value is string{return typeof value==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(value);}
export function makeMonth(month:string,profile:BodyProfile,diet:DietPreferences,catalog:CatalogItem[]):DayPlan[]|null{
 if(!validMonth(month))return null;
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const result:DayPlan[]=[];
 for(let i=0;i<days;i++){
  const chosen=recommendMeals(profile,diet,i+year*12+m,catalog,result.map(day=>day.recommendation.meals));
  if(!chosen)return null;
  const recommendation={...chosen,scheduleVersion:1};
  result.push({date:`${month}-${String(i+1).padStart(2,'0')}`,recommendation});
 }
 return result;
}
const productIds:Record<string,string>={cereal:'cornflakes',milk:'milk',rice:'rice',chicken:'chicken',tofu:'tofu',egg:'eggs',banana:'banana',oats:'oats',yogurt:'yogurt',oil:'olive-oil',salmon:'salmon',beans:'chickpeas',pasta:'whole-wheat-pasta',veg:'vegetable-mix'};
export function ingredientBasket(days:DayPlan[],catalog:CatalogItem[],owned:string[]=[]){
 const grouped=new Map<string,{food:string;name:string;grams:number}>();
 for(const day of days)for(const meal of day.recommendation.meals)for(const i of meal.ingredients){
  const previous=grouped.get(i.food);grouped.set(i.food,{food:i.food,name:i.name,grams:(previous?.grams??0)+i.grams});
 }
 return [...grouped.values()].map(row=>{
  const product=catalog.find(p=>p.id===productIds[row.food]&&p.productUrl)??null;
  // Do not equate cooked ingredient weights with raw products or grams with millilitres/counts.
  const sameBasis=row.food!=='milk'&&product?.unit==='g'&&product.quantity>0&&!product.priceNote?.includes('시작가')&&
   (!['rice','chicken','beans','pasta'].includes(row.food)||/익힌|조리 후|즉석밥|햇반/.test(product.name+' '+product.detail));
  const packs=sameBasis?Math.ceil(row.grams/product!.quantity):null;
  const have=owned.includes(row.food);
  return {...row,unit:row.food==='milk'?'mL':'g',product,packs,have,cost:have?0:packs!==null?packs*product!.price:null,leftGrams:packs!==null?packs*product!.quantity-row.grams:null};
 });
}
export function selectedWeek(days:DayPlan[],start:string){
 const end=new Date(`${start}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+7);
 return days.filter(d=>d.date>=start&&d.date<end.toISOString().slice(0,10));
}

export function upgradeMonth(month:string,profile:BodyProfile,diet:DietPreferences,catalog:CatalogItem[],previous:DayPlan[]):DayPlan[]|null {
 const fresh=makeMonth(month,profile,diet,catalog);if(!fresh)return null;
 // Older month plans used their day index as the recipe variant. Preserve deviations as manual edits.
 for(let i=0;i<fresh.length;i++){
  const old=previous.find(d=>d.date===fresh[i].date),baseline=recommendMeals(profile,diet,i,catalog);
  if(!old||!baseline)continue;
  old.recommendation.meals.forEach((meal,slot)=>{if(meal.name!==baseline.meals[slot]?.name&&fresh[i].recommendation.meals[slot])fresh[i].recommendation.meals[slot]=meal;});
  fresh[i].recommendation.total=fresh[i].recommendation.meals.reduce((sum,m)=>sum+m.kcal,0);
  fresh[i].recommendation.protein=fresh[i].recommendation.meals.reduce((sum,m)=>sum+m.protein,0);
 }
 return fresh;
}
