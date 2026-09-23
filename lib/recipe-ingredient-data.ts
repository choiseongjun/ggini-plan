import type {IngredientNutrition, RecipeTemplate} from './recipe-optimizer';

// Raw-ingredient nutrition (per 100g, "as used in cooking"), sourced from the government's own
// RAW-classified rows (foodsafety_nutrition_canonical, food_type='RAW', 3,693 rows imported from
// 전국통합식품영양성분정보(원재료성식품)표준데이터) wherever a plain "생것" match exists. 춘장/간장 reuse
// the PROCESSED dataset's own registered values (they're prepared condiments, not raw commodities).
// A few genuinely-prepared items (중화면, 식용유, 두부) have no RAW-dataset counterpart at all — those
// keep a hand-entered standard reference figure, clearly noted below.
// pricePer100gWon is a rough standard-retail estimate, NOT a real seller's price — there is no
// purchase link for any of this; it only exists so budget filtering has a number to work with.
// packGrams is the realistic minimum unit this is actually sold in at a Korean grocery store (a bundle,
// a bag, a tub) — a recipe using 11g of scallion still means buying a whole ~500g bundle. Pairing this
// with pricePer100gWon gives a realistic whole-pack price (lib/recipe-optimizer-plan.ts), and pooling
// the SAME ingredient's fractional pack usage across every recipe in a plan (the same mechanism the
// real-catalog recipes already use) is what makes a week's shopping cost look like real grocery costs
// instead of "exact grams used," which was making every recipe look implausibly cheap.
export const ingredientNutritionTable: IngredientNutrition[] = [
 {id: 'rice-raw', name: '쌀(멥쌀, 백미, 생것)', per100g: {kcal: 366, carbohydrate: 78.74, protein: 6.81, fat: 1.05, sugar: 0.5, sodium: 2}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 멥쌀_백미_생것', pricePer100gWon: 250, packGrams: 1000},
 {id: 'noodle-wheat', name: '중화면(삶은 것)', per100g: {kcal: 130, carbohydrate: 26, protein: 4.5, fat: 0.6, sugar: 0.5, sodium: 5}, sourceNote: '표준 영양성분 참고값 (원재료성식품DB에 없음)', pricePer100gWon: 150, packGrams: 300},
 {id: 'onion', name: '양파(생것)', per100g: {kcal: 29, carbohydrate: 6.52, protein: 0.96, fat: 0.17, sugar: 4.71, sodium: 2}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 양파_생것', pricePer100gWon: 60, packGrams: 1000},
 {id: 'cabbage', name: '양배추(생것)', per100g: {kcal: 29, carbohydrate: 6.98, protein: 1.36, fat: 0.12, sugar: 4.40, sodium: 9}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 양배추_생것', pricePer100gWon: 50, packGrams: 1800},
 {id: 'mushroom', name: '표고버섯(생것)', per100g: {kcal: 26, carbohydrate: 8.03, protein: 4.44, fat: 0.32, sugar: 0.40, sodium: 2}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 표고버섯_갓_생것', pricePer100gWon: 180, packGrams: 150},
 {id: 'chunjang', name: '춘장', per100g: {kcal: 155, carbohydrate: 28, protein: 8, fat: 1.3, sugar: 16, sodium: 5190}, sourceNote: '정부 식품영양성분DB (가공식품)', pricePer100gWon: 120, packGrams: 500},
 {id: 'soy-sauce', name: '간장', per100g: {kcal: 105, carbohydrate: 9, protein: 10, fat: 0.1, sugar: 2, sodium: 6300}, sourceNote: '정부 식품영양성분DB (가공식품)', pricePer100gWon: 80, packGrams: 500},
 {id: 'cooking-oil', name: '식용유', per100g: {kcal: 900, carbohydrate: 0, protein: 0, fat: 100, sugar: 0, sodium: 0}, sourceNote: '표준 영양성분 참고값 (원재료성식품DB에 없음)', pricePer100gWon: 90, packGrams: 900},
 {id: 'squid', name: '오징어(생것)', per100g: {kcal: 104, carbohydrate: 0.16, protein: 18.84, fat: 1.44, sugar: 0, sodium: 199}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 오징어류_오징어_육_생것', pricePer100gWon: 350, packGrams: 300},
 {id: 'shrimp', name: '새우(생것)', per100g: {kcal: 82, carbohydrate: 0.1, protein: 18.1, fat: 0.6, sugar: 0.1, sodium: 150}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 새우류_대하_육_생것 (나트륨은 표준 참고값)', pricePer100gWon: 500, packGrams: 400},
 {id: 'pork', name: '돼지고기(앞다리, 생것)', per100g: {kcal: 159, carbohydrate: 0, protein: 20.21, fat: 7.87, sugar: 0, sodium: 51}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 돼지고기_앞다리_생것', pricePer100gWon: 280, packGrams: 500},
 {id: 'beef', name: '소고기(한우 3등급 등심, 생것)', per100g: {kcal: 117, carbohydrate: 0, protein: 21.3, fat: 2.9, sugar: 0, sodium: 49}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 소고기_한우(3등급)_등심_생것', pricePer100gWon: 700, packGrams: 300},
 {id: 'chicken-breast', name: '닭가슴살(살코기, 생것)', per100g: {kcal: 115, carbohydrate: 0.1, protein: 24, fat: 1.4, sugar: 0, sodium: 58}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 닭고기_살코기_생것', pricePer100gWon: 180, packGrams: 500},
 {id: 'egg', name: '달걀(생것)', per100g: {kcal: 136, carbohydrate: 0.79, protein: 12.91, fat: 8.25, sugar: 0.11, sodium: 139}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 달걀_생것', pricePer100gWon: 390, packGrams: 1500},
 {id: 'tofu', name: '두부', per100g: {kcal: 77, carbohydrate: 2, protein: 6, fat: 5, sugar: 0.5, sodium: 8}, sourceNote: '표준 영양성분 참고값 (원재료성식품DB에 없음, 가공식품으로 분류)', pricePer100gWon: 150, packGrams: 300},
 {id: 'sugar', name: '설탕(백설탕)', per100g: {kcal: 387, carbohydrate: 99.96, protein: 0, fat: 0.01, sugar: 99.70, sodium: 1}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 설탕_백설탕', pricePer100gWon: 50, packGrams: 1000},
 {id: 'garlic', name: '마늘(생것)', per100g: {kcal: 128, carbohydrate: 26.42, protein: 7.45, fat: 0.16, sugar: 0.23, sodium: 3}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 마늘_구근_생것', pricePer100gWon: 200, packGrams: 500},
 {id: 'scallion', name: '대파(생것)', per100g: {kcal: 23, carbohydrate: 4.8, protein: 1.78, fat: 0.15, sugar: 2.63, sodium: 0}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 파_대파_생것', pricePer100gWon: 40, packGrams: 500},
 {id: 'doenjang', name: '된장', per100g: {kcal: 180, carbohydrate: 18, protein: 13, fat: 6, sugar: 18, sodium: 4480}, sourceNote: '정부 식품영양성분DB (가공식품)', pricePer100gWon: 130, packGrams: 500},
 {id: 'gochujang', name: '고추장', per100g: {kcal: 205, carbohydrate: 42, protein: 5, fat: 2, sugar: 25, sodium: 2760}, sourceNote: '정부 식품영양성분DB (가공식품)', pricePer100gWon: 140, packGrams: 500},
 {id: 'sesame-oil', name: '참기름', per100g: {kcal: 920, carbohydrate: 0.13, protein: 0, fat: 99.84, sugar: 0, sodium: 0}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 참기름', pricePer100gWon: 350, packGrams: 160},
 {id: 'radish', name: '무(생것)', per100g: {kcal: 18, carbohydrate: 4, protein: 0.6, fat: 0.1, sugar: 2.5, sodium: 15}, sourceNote: '표준 영양성분 참고값 (원재료성식품DB에 품종별 항목만 있어 표준치 사용)', pricePer100gWon: 30, packGrams: 1200},
 {id: 'bean-sprout', name: '콩나물(생것)', per100g: {kcal: 43, carbohydrate: 3.44, protein: 4.66, fat: 1.19, sugar: 0.47, sodium: 3}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 콩나물_생것', pricePer100gWon: 40, packGrams: 300},
 {id: 'seaweed', name: '미역(생것)', per100g: {kcal: 10, carbohydrate: 3.77, protein: 0.8, fat: 0.22, sugar: 0, sodium: 5}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 미역류_생것 (나트륨은 표준 참고값)', pricePer100gWon: 100, packGrams: 200},
 {id: 'potato', name: '감자(생것)', per100g: {kcal: 70, carbohydrate: 16.07, protein: 1.93, fat: 0.03, sugar: 0, sodium: 1}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 감자_수미_생것', pricePer100gWon: 40, packGrams: 1500},
 {id: 'flour', name: '밀가루(강력분)', per100g: {kcal: 334, carbohydrate: 72.89, protein: 13.59, fat: 1.11, sugar: 0, sodium: 1}, sourceNote: '정부 식품영양성분DB (원재료성식품) · 밀_강력밀가루_분말화한것', pricePer100gWon: 30, packGrams: 1000},
];

export const recipeTemplates: RecipeTemplate[] = [
 // 서양식 아침(샌드위치·토스트·베이글·계란요리·요거트·시리얼). 밥 없이 그 자체로 한 끼이고 아침에만 추천한다.
 // 기본 재료표에 빵·유제품이 없어 밀가루·달걀·고기로 근사하지만, 실제 재료는 GPT 재료 목록이 대신한다.
 {
  id: 'western-breakfast', name: '서양식 아침', matches: /샌드위치|토스트|베이글|스크램블|오믈렛|시리얼_우유|그릭요거트|플레인요거트|그래놀라 요거트|에그바게/, totalGrams: 100,
  groups: [
   {id: 'bread', label: '빵·곡물', ingredientIds: ['flour'], minPercent: 20, maxPercent: 60},
   {id: 'protein', label: '달걀·고기', ingredientIds: ['egg', 'pork', 'chicken-breast'], minPercent: 10, maxPercent: 45},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'cabbage'], minPercent: 0, maxPercent: 25},
   {id: 'fat', label: '버터·기름', ingredientIds: ['cooking-oil'], minPercent: 1, maxPercent: 12},
   {id: 'sugar', label: '잼·설탕', ingredientIds: ['sugar'], minPercent: 0, maxPercent: 10},
  ],
 },
 {
  id: 'jjajang', name: '짜장류', matches: /짜장/, totalGrams: 100,
  groups: [
   {id: 'noodle', label: '면류', ingredientIds: ['noodle-wheat'], minPercent: 35, maxPercent: 65},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'cabbage'], minPercent: 10, maxPercent: 30},
   {id: 'seafood', label: '해산물', ingredientIds: ['squid', 'shrimp'], minPercent: 0, maxPercent: 25},
   {id: 'meat', label: '육류', ingredientIds: ['pork'], minPercent: 0, maxPercent: 20},
   {id: 'sauce', label: '소스류', ingredientIds: ['chunjang', 'soy-sauce', 'sugar'], minPercent: 3, maxPercent: 15},
   {id: 'oil', label: '식용유', ingredientIds: ['cooking-oil'], minPercent: 0, maxPercent: 7},
  ],
 },
 {
  id: 'stirfry-meat-rice', name: '고기볶음+밥류', matches: /볶음|덮밥/, totalGrams: 100,
  groups: [
   {id: 'rice', label: '밥', ingredientIds: ['rice-raw'], minPercent: 30, maxPercent: 55},
   {id: 'meat', label: '육류', ingredientIds: ['pork', 'beef', 'chicken-breast'], minPercent: 15, maxPercent: 40},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'cabbage', 'mushroom'], minPercent: 10, maxPercent: 30},
   {id: 'sauce', label: '양념', ingredientIds: ['soy-sauce', 'sugar', 'cooking-oil'], minPercent: 3, maxPercent: 15},
  ],
 },
 {
  id: 'jjigae', name: '찌개·전골류', matches: /찌개|전골/, totalGrams: 100,
  groups: [
   {id: 'protein', label: '주재료(고기·해산물·두부)', ingredientIds: ['pork', 'beef', 'tofu', 'squid', 'shrimp'], minPercent: 15, maxPercent: 35},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'cabbage', 'mushroom', 'scallion', 'radish'], minPercent: 20, maxPercent: 40},
   {id: 'paste', label: '장류', ingredientIds: ['doenjang', 'gochujang', 'soy-sauce'], minPercent: 3, maxPercent: 10},
   {id: 'aromatic', label: '마늘', ingredientIds: ['garlic'], minPercent: 0, maxPercent: 3},
  ],
 },
 {
  // (?<!설|사) blocks "탕" inside "설탕"(sugar)/"사탕"(candy)/"솜사탕"(cotton candy) — these matched as a
  // false positive before, sending "아이스크림_...솜사탕..." (ice cream) and "...설탕치즈..." (a sandwich)
  // through this savory stew template and producing nonsense recipes for desserts/pastries.
  id: 'guktang', name: '국·탕류', matches: /국(?!수)|(?<!설|사)탕(?!수)/, totalGrams: 100,
  groups: [
   {id: 'protein', label: '주재료(고기·해산물·두부)', ingredientIds: ['pork', 'beef', 'squid', 'shrimp', 'tofu'], minPercent: 5, maxPercent: 25},
   {id: 'vegetable', label: '채소·해조류', ingredientIds: ['onion', 'radish', 'scallion', 'seaweed', 'bean-sprout', 'cabbage'], minPercent: 15, maxPercent: 40},
   {id: 'seasoning', label: '양념', ingredientIds: ['soy-sauce', 'doenjang', 'garlic'], minPercent: 1, maxPercent: 6},
  ],
 },
 {
  id: 'gui', name: '구이류', matches: /구이/, totalGrams: 100,
  groups: [
   {id: 'protein', label: '주재료(고기·해산물)', ingredientIds: ['pork', 'beef', 'chicken-breast', 'squid'], minPercent: 60, maxPercent: 90},
   {id: 'seasoning', label: '양념·기름', ingredientIds: ['soy-sauce', 'garlic', 'cooking-oil'], minPercent: 2, maxPercent: 10},
  ],
 },
 {
  id: 'namul', name: '나물·무침·생채류', matches: /나물|무침|숙채|겉절이|생채|냉채|물회/, totalGrams: 100,
  groups: [
   {id: 'vegetable', label: '채소', ingredientIds: ['cabbage', 'bean-sprout', 'radish', 'scallion', 'onion'], minPercent: 55, maxPercent: 90},
   {id: 'protein', label: '해산물·고기 (선택)', ingredientIds: ['squid', 'chicken-breast'], minPercent: 0, maxPercent: 25},
   {id: 'seasoning', label: '양념', ingredientIds: ['soy-sauce', 'sesame-oil', 'garlic', 'gochujang'], minPercent: 3, maxPercent: 15},
  ],
 },
 {
  id: 'jorim', name: '조림류', matches: /조림/, totalGrams: 100,
  groups: [
   {id: 'protein', label: '주재료(고기·해산물·두부)', ingredientIds: ['pork', 'beef', 'squid', 'tofu'], minPercent: 30, maxPercent: 55},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'radish', 'scallion'], minPercent: 10, maxPercent: 30},
   {id: 'sauce', label: '양념', ingredientIds: ['soy-sauce', 'sugar', 'garlic'], minPercent: 5, maxPercent: 15},
  ],
 },
 {
  id: 'twigim', name: '튀김류', matches: /튀김/, totalGrams: 100,
  groups: [
   {id: 'main', label: '주재료(감자·고기·해산물)', ingredientIds: ['potato', 'pork', 'chicken-breast', 'squid', 'shrimp'], minPercent: 50, maxPercent: 80},
   {id: 'batter', label: '튀김옷', ingredientIds: ['flour', 'egg'], minPercent: 10, maxPercent: 25},
   {id: 'oil', label: '식용유', ingredientIds: ['cooking-oil'], minPercent: 5, maxPercent: 20},
  ],
 },
 {
  id: 'juk', name: '죽·스프류', matches: /죽|스프|미음/, totalGrams: 100,
  groups: [
   {id: 'rice', label: '쌀', ingredientIds: ['rice-raw'], minPercent: 10, maxPercent: 25},
   {id: 'protein', label: '주재료(고기·해산물)', ingredientIds: ['beef', 'chicken-breast', 'squid', 'shrimp'], minPercent: 0, maxPercent: 20},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'mushroom', 'potato'], minPercent: 0, maxPercent: 20},
   {id: 'seasoning', label: '양념', ingredientIds: ['soy-sauce', 'sesame-oil'], minPercent: 0, maxPercent: 5},
  ],
 },
 {
  id: 'jeon', name: '전·부침류', matches: /전$|전_|부침|빈대떡/, totalGrams: 100,
  groups: [
   {id: 'main', label: '주재료(채소·해산물·고기)', ingredientIds: ['potato', 'onion', 'squid', 'pork'], minPercent: 40, maxPercent: 65},
   {id: 'batter', label: '반죽(밀가루·달걀)', ingredientIds: ['flour', 'egg'], minPercent: 20, maxPercent: 40},
   {id: 'oil', label: '식용유', ingredientIds: ['cooking-oil'], minPercent: 5, maxPercent: 15},
  ],
 },
 {
  id: 'myeon', name: '국수·냉면·라면류', matches: /국수|냉면|라면|라멘|기스면|막국수/, totalGrams: 100,
  groups: [
   {id: 'noodle', label: '면', ingredientIds: ['noodle-wheat'], minPercent: 30, maxPercent: 55},
   {id: 'protein', label: '고기·해산물·달걀 (선택)', ingredientIds: ['egg', 'pork', 'beef', 'squid'], minPercent: 0, maxPercent: 20},
   {id: 'vegetable', label: '채소', ingredientIds: ['scallion', 'cabbage', 'bean-sprout', 'radish', 'onion'], minPercent: 10, maxPercent: 30},
   {id: 'sauce', label: '양념·국물', ingredientIds: ['soy-sauce', 'gochujang', 'sugar', 'sesame-oil'], minPercent: 3, maxPercent: 15},
  ],
 },
 {
  id: 'bap-etc', name: '비빔밥·김밥·리조또 등 밥류', matches: /김밥|비빔밥|리소토|리조또|보리밥|귀리밥|기장밥|누룽지|묵밥/, totalGrams: 100,
  groups: [
   {id: 'rice', label: '밥', ingredientIds: ['rice-raw'], minPercent: 40, maxPercent: 70},
   {id: 'protein', label: '고기·해산물·달걀·두부 (선택)', ingredientIds: ['egg', 'pork', 'beef', 'squid', 'tofu'], minPercent: 0, maxPercent: 25},
   {id: 'vegetable', label: '채소', ingredientIds: ['onion', 'cabbage', 'bean-sprout', 'scallion', 'mushroom'], minPercent: 10, maxPercent: 30},
   {id: 'sauce', label: '양념', ingredientIds: ['gochujang', 'soy-sauce', 'sesame-oil'], minPercent: 2, maxPercent: 10},
  ],
 },
 {
  id: 'jjim', name: '찜류', matches: /찜/, totalGrams: 100,
  groups: [
   {id: 'protein', label: '주재료(고기·해산물·달걀·두부)', ingredientIds: ['pork', 'beef', 'chicken-breast', 'squid', 'egg', 'tofu'], minPercent: 30, maxPercent: 60},
   {id: 'vegetable', label: '채소', ingredientIds: ['cabbage', 'onion', 'scallion', 'radish', 'potato'], minPercent: 15, maxPercent: 35},
   {id: 'sauce', label: '양념', ingredientIds: ['soy-sauce', 'gochujang', 'doenjang', 'garlic', 'sugar'], minPercent: 2, maxPercent: 15},
  ],
 },
 {
  id: 'kimchi', name: '김치류', matches: /김치|깍두기|동치미|오이소박이/, totalGrams: 100,
  groups: [
   {id: 'vegetable', label: '주재료(배추·무 등)', ingredientIds: ['cabbage', 'radish', 'scallion'], minPercent: 70, maxPercent: 88},
   {id: 'seasoning', label: '양념(고추장·마늘 등)', ingredientIds: ['gochujang', 'garlic', 'sugar'], minPercent: 8, maxPercent: 25},
  ],
 },
];

export function ingredientMap(): Map<string, IngredientNutrition> {
 return new Map(ingredientNutritionTable.map((i) => [i.id, i]));
}

// Desserts/candy/drinks, not savory dishes — matching one into a savory template produces nonsense
// (e.g. "아이스크림_...솜사탕 아이스크림" tripped the 국·탕류 regex on the "탕" inside "솜사탕", then got
// optimized against a pork/tofu/doenjang stew template, producing a "protein-rich" ice cream recipe).
// Checked before any template regex runs, since the false match is on a substring the regex can't
// otherwise tell apart from a real dish name ending the same way.
const NON_DISH_NAME = /아이스크림|사탕|초콜릿|캔디|젤리|과자|쿠키|케이크|빙수|셔벗|파르페|푸딩|젤라또|카라멜|마카롱|도넛|와플|음료|주스|커피/;

export function templateForDishName(name: string): RecipeTemplate | null {
 if (NON_DISH_NAME.test(name)) return null;
 return recipeTemplates.find((t) => t.matches.test(name)) ?? null;
}
