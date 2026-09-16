import type { CatalogItem } from "./catalog";
import { calorieEstimate, type BodyProfile } from "./body-profile";

export const dietStyles = { balanced: "골고루 집밥", protein: "단백질 중심", plant: "식물성 식단", quick: "간편하게" } as const;
export const excludedFoods = { chicken: "닭고기", fish: "생선", egg: "달걀", soy: "콩·두부", milk: "유제품", wheat: "밀" } as const;
export type DietPreferences = { style: keyof typeof dietStyles; fasting: "none" | "14:10" | "16:8"; start: number; excluded: (keyof typeof excludedFoods)[] };
export const defaultDiet: DietPreferences = { style: "balanced", fasting: "none", start: 8, excluded: [] };
export function parseDiet(value: unknown): DietPreferences | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.style !== "string" || !Object.hasOwn(dietStyles, p.style) || !["none", "14:10", "16:8"].includes(String(p.fasting)) || typeof p.start !== "number" || !Number.isInteger(p.start) || p.start < 0 || p.start > 23 || !Array.isArray(p.excluded) || p.excluded.length > 6 || p.excluded.some(x => typeof x !== "string" || !Object.hasOwn(excludedFoods, x))) return null;
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
type Recipe = { name: string; emoji: string; styles: DietPreferences["style"][]; avoid: DietPreferences["excluded"]; ingredients: [Food, number][]; tip: string };
const recipes: Recipe[] = [
  {name:"닭가슴살 채소 덮밥",emoji:"🍚",styles:["balanced","protein","quick"],avoid:["chicken"],ingredients:[["rice",200],["chicken",120],["veg",150],["oil",8]],tip:"익힌 닭가슴살과 데친 채소를 밥 위에 올려요."},
  {name:"두부 달걀 볶음밥",emoji:"🍳",styles:["balanced","protein","quick"],avoid:["soy","egg"],ingredients:[["rice",180],["tofu",150],["egg",100],["veg",100],["oil",5]],tip:"두부의 물기를 빼고 달걀, 채소, 밥과 함께 볶아요."},
  {name:"연어 현미 한 접시",emoji:"🐟",styles:["balanced","protein"],avoid:["fish"],ingredients:[["rice",200],["salmon",120],["veg",180]],tip:"연어를 충분히 익혀 현미밥과 채소를 곁들여요."},
  {name:"바나나 요거트 오트볼",emoji:"🥣",styles:["quick","protein"],avoid:["milk"],ingredients:[["oats",70],["yogurt",200],["banana",120]],tip:"오트밀을 불린 뒤 요거트와 바나나를 올려요."},
  {name:"병아리콩 채소 라이스볼",emoji:"🥗",styles:["plant","balanced"],avoid:[],ingredients:[["rice",160],["beans",180],["veg",180],["oil",8]],tip:"삶은 병아리콩과 채소를 현미밥에 곁들여요."},
  {name:"두부 채소 구이 정식",emoji:"🥦",styles:["plant","protein","balanced"],avoid:["soy"],ingredients:[["rice",180],["tofu",250],["veg",180],["oil",8]],tip:"두부와 채소를 노릇하게 구워 밥과 먹어요."},
  {name:"병아리콩 통밀 파스타",emoji:"🍝",styles:["plant","quick"],avoid:["wheat"],ingredients:[["pasta",200],["beans",130],["veg",150],["oil",8]],tip:"삶은 파스타와 병아리콩, 채소를 올리브유에 볶아요."},
  {name:"바나나 병아리콩 오트볼",emoji:"🍌",styles:["plant","quick"],avoid:[],ingredients:[["oats",70],["beans",100],["banana",150]],tip:"오트밀을 물에 익히고 으깬 병아리콩과 바나나를 섞어요."},
];
export function clockTime(hours: number) { const minutes = Math.round(hours * 60); return `${minutes >= 1440 ? "다음 날 " : ""}${String(Math.floor(minutes / 60) % 24).padStart(2,"0")}:${String(minutes % 60).padStart(2,"0")}`; }
export function recommendMeals(profile: BodyProfile, diet: DietPreferences, variant = 0, catalog: CatalogItem[] = []) {
  const ingredientIds: Record<string,string> = {rice:"rice",chicken:"chicken",tofu:"tofu",egg:"eggs",yogurt:"yogurt",banana:"banana",oats:"oats",veg:"broccoli"};
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
  const candidates = recipes.filter(r => !r.avoid.some(a => diet.excluded.includes(a)) && !r.ingredients.some(([food])=>productFor(food)?.allergens?.some(a=>diet.excluded.some(x=>x===a))) && (diet.style !== "plant" || r.styles.includes("plant")))
    .sort((a,b) => Number(b.styles.includes(diet.style))-Number(a.styles.includes(diet.style)));
  if (!candidates.length) return null;
  const preferred = candidates.filter(r => r.styles.includes(diet.style));
  const pool = preferred.length >= profile.meals ? preferred : candidates;
  const windowHours = diet.fasting === "16:8" ? 8 : diet.fasting === "14:10" ? 10 : 12;
  const meals = Array.from({length: profile.meals}, (_, i) => {
    const recipe = pool[(variant + i) % pool.length];
    const base = recipe.ingredients.reduce((sum,[food,g]) => sum + nutrient(food,1)*g/100,0);
    // Cap portions: never manufacture an impractically large meal to match an estimate.
    const ratio = Math.max(0.5,Math.min(1.8,energy.perMeal/base));
    const ingredients = recipe.ingredients.map(([food,g]) => ({name:foods[food][0],grams:Math.round(g*ratio),food,product:productFor(food)?{id:productFor(food)!.id,name:productFor(food)!.name,url:productFor(food)!.productUrl}:null}));
    const sum = (index: 1|2|3|4) => Math.round(ingredients.reduce((total,item) => total + nutrient(item.food,index)*item.grams/100,0));
    return {...recipe,ingredients,kcal:sum(1),protein:sum(2),carbs:sum(3),fat:sum(4),time:clockTime(diet.start+(profile.meals===1?0:i*(windowHours-1)/(profile.meals-1)))};
  });
  return {target:energy.daily, meals,total:meals.reduce((s,m)=>s+m.kcal,0),protein:meals.reduce((s,m)=>s+m.protein,0),end:clockTime(diet.start+windowHours)};
}
