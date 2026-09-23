import type {PlanProduct} from './shopping-plan';
export function nutritionIsEstimated(p:PlanProduct):boolean {
  return Boolean(p.nutritionEstimate||p.nutritionBasis?.includes('추정 포함')||p.recipe?.ingredients.some(i=>nutritionIsEstimated(i.product)));
}
export function servingNutrients(p:PlanProduct):{calories:number|null;protein:number|null;carbs:number|null;fat:number|null;sodium:number|null} {
  if(p.recipe){
    const parts=p.recipe.ingredients.map(i=>({n:servingNutrients(i.product),factor:i.product.servings*i.packs}));
    const sum=(key:'carbs'|'fat'|'sodium')=>parts.length&&parts.every(i=>i.n[key]!==null)?Math.round(parts.reduce((s,i)=>s+i.n[key]!*i.factor,0)*1000)/1000:null;
    return {...p.recipe.nutrition,carbs:sum('carbs'),fat:sum('fat'),sodium:sum('sodium')};
  }
  const basis=p.nutritionBasis?.replace(/ · 추정 포함/g,'').replaceAll(' ','');
  // Only an explicit gram or piece basis. Never infer serving weight from a pack count,
  // or convert mL, cooked/dry weights, or separate component tables.
  const match=basis?.match(/^(?:가식부|총내용량)?(\d+(?:\.\d+)?)g(?:당|기준)?$/);
  const grams=p.servingGrams??(p.unit==='g'&&p.servings>0?p.quantity/p.servings:null);
  const pieces=basis?.match(/^(\d+(?:\.\d+)?)개(?:당|기준)?$/);
  const factor=match&&Number(match[1])>0&&grams!==null&&Number.isFinite(grams)&&grams>0?grams/Number(match[1]):pieces&&Number(pieces[1])>0&&p.unit==='개'&&p.quantity>0&&p.servings>0?p.quantity/p.servings/Number(pieces[1]):null;
  const sourced=Boolean(p.nutritionSourceUrl||p.nutritionPhotoUrl||p.nutritionEstimate);
  const value=(n:number|null|undefined)=>sourced&&factor!==null&&typeof n==='number'&&Number.isFinite(n)&&n>=0?Math.round(n*factor*1000)/1000:null;
  return {calories:value(p.caloriesKcal),protein:value(p.proteinG),carbs:value(p.carbohydratesG),fat:value(p.fatG),sodium:value(p.sodiumMg)};
}

// 한 끼 칼로리를 요리 · 밥 한 공기 · 밑반찬으로 나눈다. 합계만 보여주면 '배추전 823kcal'처럼 요리 하나가
// 그만큼인 것으로 읽히고, '밥·반찬 380kcal'도 무엇이 얼마인지 알 수 없었다. 요리는 1인분 무게(g)를 같이 준다.
const RICE_COOKED_GRAMS=210;
export function mealCalorieParts(p:PlanProduct){
  const total=servingNutrients(p).calories;
  const kcalOf=(part:{product:PlanProduct;packs:number})=>(servingNutrients(part.product).calories??0)*part.packs*part.product.servings;
  const gramsOf=(part:{product:PlanProduct;packs:number})=>part.product.unit==='g'?part.packs*part.product.quantity*part.product.servings:0;
  if(!p.recipe||total===null)return {total,dish:{kcal:total,grams:null as number|null},rice:null,sides:null};
  let rice=0,hasRice=false,sideKcal=0,dishGrams=0;const sideNames:string[]=[];
  for(const part of p.recipe.ingredients){
    if(part.label.startsWith('함께 먹는 밥')){rice+=kcalOf(part);hasRice=true;continue;}
    if(part.group){sideKcal+=kcalOf(part);if(!sideNames.includes(part.group))sideNames.push(part.group);continue;}
    dishGrams+=gramsOf(part);
  }
  return {
    total,
    dish:{kcal:Math.max(0,total-rice-sideKcal),grams:dishGrams>0?Math.round(dishGrams/10)*10:null},
    rice:hasRice?{kcal:rice,grams:RICE_COOKED_GRAMS}:null,
    sides:sideNames.length?{kcal:sideKcal,names:sideNames.map(n=>n.split('_')[0])}:null,
  };
}
