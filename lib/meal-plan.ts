import type { CatalogItem } from "./catalog";
import { excludedFoods, excludedFoodAliases, type ExcludedFood } from './excluded-foods';
export { excludedFoods, excludedFoodGroups } from './excluded-foods';
import { calorieEstimate, type BodyProfile } from "./body-profile";

export const dietStyles = { balanced: "골고루 집밥", protein: "단백질 중심", plant: "식물성 식단", quick: "간편하게" } as const;
export type DietPreferences = { style: keyof typeof dietStyles; fasting: "none" | "14:10" | "16:8"; start: number; excluded: (keyof typeof excludedFoods)[] };
export const defaultDiet: DietPreferences = { style: "balanced", fasting: "none", start: 8, excluded: [] };
export function parseDiet(value: unknown): DietPreferences | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.style !== "string" || !Object.hasOwn(dietStyles, p.style) || !["none", "14:10", "16:8"].includes(String(p.fasting)) || typeof p.start !== "number" || !Number.isInteger(p.start) || p.start < 0 || p.start > 23 || !Array.isArray(p.excluded) || p.excluded.length > Object.keys(excludedFoods).length || p.excluded.some(x => typeof x !== "string" || !Object.hasOwn(excludedFoods, x))) return null;
  return { style: p.style as DietPreferences["style"], fasting: p.fasting as DietPreferences["fasting"], start: p.start, excluded: [...new Set(p.excluded)] };
}
// Representative ingredient values per 100 g; recipes are estimates, not product labels.
const foods = {
  rice: ["현미밥 (조리 후)", 153, 3.2, 32, 1], chicken: ["닭가슴살 (익힌 것)", 165, 31, 0, 3.6],
  tofu: ["두부", 85, 9, 2, 4.5], egg: ["달걀", 143, 12.6, 0.7, 9.5],
  salmon: ["연어", 208, 20, 0, 13], veg: ["채소 믹스", 30, 2, 5, 0.3],
  oil: ["올리브유", 884, 0, 0, 100], oats: ["오트밀 (마른 것)", 389, 17, 66, 7],
  yogurt: ["무가당 그릭요거트", 73, 10, 4, 2], banana: ["바나나", 89, 1.1, 23, 0.3],
  beans: ["병아리콩 (삶은 것)", 164, 8.9, 27, 2.6], pasta: ["통밀 파스타 (삶은 것)", 149, 6, 30, 1.7],
} as const;
type Food = keyof typeof foods;
type MealSlot = "breakfast" | "lunch" | "dinner";
export function mealSlot(hours:number):MealSlot { const hour=((hours%24)+24)%24;return hour>=5&&hour<11?"breakfast":hour>=11&&hour<17?"lunch":"dinner"; }
type Recipe = { slots:MealSlot[]; name: string; emoji: string; styles: DietPreferences["style"][]; avoid: DietPreferences["excluded"]; ingredients: [Food, number][]; tip: string };
const recipes: Recipe[] = [
 {slots:["lunch","dinner"],name:"닭가슴살 통밀 파스타",emoji:"🍝",styles:["balanced","protein","quick"],avoid:["chicken","wheat"],ingredients:[["pasta",200],["chicken",120],["veg",120],["oil",8]],tip:"삶은 파스타에 익힌 닭가슴살과 데친 채소를 넣고 올리브유로 가볍게 볶아요."},
 {slots:["lunch","dinner"],name:"연어 채소 파스타",emoji:"🍝",styles:["balanced","protein"],avoid:["fish","wheat"],ingredients:[["pasta",180],["salmon",120],["veg",150],["oil",5]],tip:"연어를 충분히 익힌 뒤 삶은 파스타와 채소를 올리브유에 함께 볶아요."},
 {slots:["lunch","dinner"],name:"달걀 채소 덮밥",emoji:"🍳",styles:["balanced","quick"],avoid:["egg"],ingredients:[["rice",180],["egg",100],["veg",150],["oil",5]],tip:"채소와 달걀을 올리브유에 충분히 익혀 현미밥 위에 올려요."},
 {slots:["lunch","dinner"],name:"병아리콩 두부 볶음밥",emoji:"🍚",styles:["plant","balanced","protein"],avoid:["soy"],ingredients:[["rice",160],["beans",100],["tofu",150],["oil",5]],tip:"삶은 병아리콩과 물기를 뺀 두부를 올리브유에 볶고 준비된 밥을 넣어요."},
 {slots:["breakfast"],name:"달걀 오트밀죽",emoji:"🥣",styles:["balanced","protein","quick"],avoid:["egg"],ingredients:[["oats",45],["egg",100]],tip:"오트밀에 물을 조금씩 넣어 끓이고 달걀을 풀어 완전히 익혀요."},
 {slots:["breakfast"],name:"두부 바나나 오트볼",emoji:"🥣",styles:["plant","quick"],avoid:["soy"],ingredients:[["oats",40],["tofu",120],["banana",100]],tip:"오트밀을 물에 익히고 충분히 데운 두부와 바나나를 곁들여요."},
  {slots:["breakfast"],name:"달걀 바나나 한 접시",emoji:"🥚",styles:["balanced","protein","quick"],avoid:["egg"],ingredients:[["egg",100],["banana",120],["yogurt",100]],tip:"달걀을 삶아 바나나와 무가당 요거트를 곁들여요. 달걀은 미리 삶아 두면 준비가 간단해요."},
  {slots:["breakfast"],name:"간단 두부 현미볼",emoji:"🥣",styles:["balanced","plant","protein","quick"],avoid:["soy"],ingredients:[["rice",120],["tofu",150],["oil",3]],tip:"준비된 현미밥과 두부를 충분히 데우고 올리브유를 조금 곁들여요."},
  {slots:["lunch","dinner"],name:"닭가슴살 채소 덮밥",emoji:"🍚",styles:["balanced","protein","quick"],avoid:["chicken"],ingredients:[["rice",200],["chicken",120],["veg",150],["oil",8]],tip:"익힌 닭가슴살과 데친 채소를 밥 위에 올려요."},
  {slots:["lunch","dinner"],name:"두부 달걀 볶음밥",emoji:"🍳",styles:["balanced","protein","quick"],avoid:["soy","egg"],ingredients:[["rice",180],["tofu",150],["egg",100],["veg",100],["oil",5]],tip:"두부의 물기를 빼고 달걀, 채소, 밥과 함께 볶아요."},
  {slots:["lunch","dinner"],name:"연어 현미 한 접시",emoji:"🐟",styles:["balanced","protein"],avoid:["fish"],ingredients:[["rice",200],["salmon",120],["veg",180]],tip:"연어를 충분히 익혀 현미밥과 채소를 곁들여요."},
  {slots:["breakfast"],name:"바나나 요거트 오트볼",emoji:"🥣",styles:["quick","protein"],avoid:["milk"],ingredients:[["oats",40],["yogurt",150],["banana",100]],tip:"오트밀을 불린 뒤 요거트와 바나나를 올려요."},
  {slots:["lunch","dinner"],name:"병아리콩 채소 라이스볼",emoji:"🥗",styles:["plant","balanced"],avoid:[],ingredients:[["rice",160],["beans",180],["veg",180],["oil",8]],tip:"삶은 병아리콩과 채소를 현미밥에 곁들여요."},
  {slots:["lunch","dinner"],name:"두부 채소 구이 정식",emoji:"🥦",styles:["plant","protein","balanced"],avoid:["soy"],ingredients:[["rice",180],["tofu",250],["veg",180],["oil",8]],tip:"두부와 채소를 노릇하게 구워 밥과 먹어요."},
  {slots:["lunch","dinner"],name:"병아리콩 통밀 파스타",emoji:"🍝",styles:["plant","quick"],avoid:["wheat"],ingredients:[["pasta",200],["beans",130],["veg",150],["oil",8]],tip:"삶은 파스타와 병아리콩, 채소를 올리브유에 볶아요."},
  {slots:["breakfast"],name:"바나나 병아리콩 오트볼",emoji:"🍌",styles:["plant","quick"],avoid:[],ingredients:[["oats",40],["beans",80],["banana",100]],tip:"오트밀을 물에 익히고 으깬 병아리콩과 바나나를 섞어요."},
];
export function clockTime(hours: number) { const minutes = Math.round(hours * 60); return `${minutes >= 1440 ? "다음 날 " : ""}${String(Math.floor(minutes / 60) % 24).padStart(2,"0")}:${String(minutes % 60).padStart(2,"0")}`; }
export function recommendMeals(profile: BodyProfile, diet: DietPreferences, variant = 0, catalog: CatalogItem[] = []) {
  const ingredientIds: Record<string,string> = {rice:"rice",chicken:"chicken",tofu:"tofu",egg:"eggs",yogurt:"yogurt",banana:"banana",oats:"oats",veg:"vegetable-mix",oil:"olive-oil",salmon:"salmon",beans:"chickpeas",pasta:"whole-wheat-pasta"};
  const productFor = (food:Food) => catalog.find(p=>p.id===ingredientIds[food]);
  const nutrient = (food:Food,index:1|2|3|4) => {
    const item=productFor(food);
    const basis=item?.nutritionBasis?.replaceAll(" ","").match(/^(?:가식부)?(\d+(?:\.\d+)?)g(?:당|기준)?$/);
    const values=item?[item.caloriesKcal,item.proteinG,item.carbohydratesG,item.fatG]:[];
    const value=values[index-1];
    return basis && Number(basis[1])>0 && value!==null && value!==undefined && (item?.nutritionSourceUrl||item?.nutritionPhotoUrl) ? value*100/Number(basis[1]) : foods[food][index];
  };
  const energy = calorieEstimate(profile);
  if (!energy) return null;
  const foodExclusions:Record<Food,ExcludedFood[]> = {
    rice:['rice'],chicken:['chicken'],tofu:['soy'],egg:['egg'],salmon:['fish'],
    veg:['broccoli','mushroom','onion','garlic','tomato'],oil:[],oats:['oats'],yogurt:['milk'],banana:['banana'],beans:['soy'],pasta:['wheat'],
  };
  const candidates = recipes.filter(r => !r.avoid.some(a => diet.excluded.includes(a)) && !r.ingredients.some(([food])=>{
    const product=productFor(food);
    return diet.excluded.some(key=>foodExclusions[food].includes(key)||product?.allergens?.includes(key)||(product && excludedFoodAliases[key].some(word=>`${product.name} ${product.detail} ${(product.allergens??[]).join(' ')}`.includes(word))));
  }) && (diet.style !== "plant" || r.styles.includes("plant")))
    .sort((a,b) => Number(b.styles.includes(diet.style))-Number(a.styles.includes(diet.style)));
  if (!candidates.length) return null;
  const windowHours = diet.fasting === "16:8" ? 8 : diet.fasting === "14:10" ? 10 : 12;
  const times=Array.from({length:profile.meals},(_,i)=>diet.start+(profile.meals===1?0:i*(windowHours-1)/(profile.meals-1)));
  const weights=times.map(time=>mealSlot(time)==='breakfast'?0.7:1.15);
  const weightTotal=weights.reduce((a,b)=>a+b,0);
  const used=new Set<string>();
  const selected=times.map(time=>{
    const eligible=candidates.filter(r=>r.slots.includes(mealSlot(time)));
    if(!eligible.length)return null;
    const fresh=eligible.filter(r=>!used.has(r.name));
    const pool=fresh.length?fresh:eligible;
    const preferred=pool.filter(r=>r.styles.includes(diet.style));
    const choices=preferred.length?preferred:pool;
    const recipe=choices[variant%choices.length];used.add(recipe.name);return recipe;
  });
  if(selected.some(r=>r===null))return null;
  const meals = selected.map((selectedRecipe, i) => {
    const recipe=selectedRecipe!;
    const slot=mealSlot(times[i]);
    const base = recipe.ingredients.reduce((sum,[food,g]) => sum + nutrient(food,1)*g/100,0);
    // Breakfast has a smaller planning share. Keep ordinary recipe portions even when energy needs are high.
    const target=energy.daily*weights[i]/weightTotal;
    const ratio = Math.max(0.5,Math.min(slot==='breakfast'?1.2:1.35,(slot==='breakfast'?Math.min(450,target):target)/base));
    const ingredients = recipe.ingredients.map(([food,g]) => ({name:foods[food][0],grams:Math.round(g*ratio),food,product:productFor(food)?{id:productFor(food)!.id,name:productFor(food)!.name,url:productFor(food)!.productUrl}:null}));
    const sum = (index: 1|2|3|4) => Math.round(ingredients.reduce((total,item) => total + nutrient(item.food,index)*item.grams/100,0));
    return {...recipe,ingredients,kcal:sum(1),protein:sum(2),carbs:sum(3),fat:sum(4),slot,label:slot==='breakfast'?'아침':slot==='lunch'?'점심':'저녁',time:clockTime(times[i])};
  });
  return {version:2,target:energy.daily, meals,total:meals.reduce((s,m)=>s+m.kcal,0),protein:meals.reduce((s,m)=>s+m.protein,0),end:clockTime(diet.start+windowHours)};
}
