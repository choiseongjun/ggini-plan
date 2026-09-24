import {getPool} from './db';
import {excludedFoodAliases, type ExcludedFood} from './excluded-foods';
import {foodReferenceFromRow, searchFoodReference, type FoodReference} from './food-reference';
import {guideContext} from './weekly-guide';
import {parseDiet} from './meal-plan';
import {healthFlags, SODIUM_DAILY, SODIUM_DAILY_PRESSURE, type HealthFlag} from './today-context';

// "지금 뭐 먹지?": 밖에서 사 먹는 한 끼를 오늘 먹은 양·남은 끼니·건강 관리 여부로 골라 주거나 비교한다.
// 음식 영양값은 음식 영양 사전(food_reference, 1회 제공량 기준). 사용자 기준치는 주간 가이드와 같은 계산.
export const EAT_OUT_KINDS = {
 korean: {label: '한식', match: null},
 snack: {label: '분식', match: /떡볶이|김밥|라볶이|순대|쫄면|라면|만두|어묵|잔치국수|칼국수|수제비/},
 chinese: {label: '중식', match: /짜장|자장|짬뽕|탕수육|마파|깐풍|유산슬|팔보채|울면|기스면|양장피|고추잡채|볶음밥|잡채밥|마라/},
 japanese: {label: '일식', match: /초밥|우동|돈가스|돈까스|라멘|규동|소바|카츠|가츠|오므라이스|카레|덮밥|텐동|사케동|회덮밥/},
 western: {label: '양식', match: /파스타|스파게티|피자|햄버거|버거|스테이크|리조또|리소토|그라탕|필라프|치킨/},
 light: {label: '가볍게', match: /샐러드|죽|포케|수프|스프|샌드위치|월남쌈|비빔밥/},
} as const;
export type EatOutKind = keyof typeof EAT_OUT_KINDS;
const MEAL_CATEGORIES = ['밥류', '면 및 만두류', '국 및 탕류', '찌개 및 전골류', '볶음류', '구이류', '조림류', '찜류', '튀김류', '전·적 및 부침류', '죽 및 스프류', '빵 및 과자류'];

export type EatOutOption = FoodReference & {verdict: 'good' | 'ok' | 'avoid'; reasons: string[]; score: number; withRice: boolean; image?: string | null};
// 식당에서 공깃밥과 함께 나오는 요리(찌개·볶음·구이…): 판단·표시에 밥 한 공기를 더한다(영양 사전 값은 요리만).
const RICE = {kcal: 310, protein: 5.6, carbs: 68, sodium: 2};
const RICE_SERVED = ['찌개 및 전골류', '국 및 탕류', '볶음류', '구이류', '조림류', '찜류', '전·적 및 부침류'];
const servedWithRice = (f: FoodReference) => RICE_SERVED.includes(f.category ?? '') && !/밥|죽|면|국수|덮밥|수제비|떡국|만두|라면|우동|짬뽕|짜장/.test(f.name);
export type EatOutState = {slot: string; budget: {kcal: number; sodium: number; carbs: number}; eaten: {kcal: number; sodium: number; sugar: number}; health: string[]; personal: boolean};

const kstHour = () => new Date(Date.now() + 9 * 3600000).getUTCHours();
const slotOf = (h: number) => h < 10 ? '아침' : h < 15 ? '점심' : h < 21 ? '저녁' : '야식';

// 이번 끼니 몫: (하루 목표 − 오늘 먹은 양) ÷ 남은 끼니 수.
async function stateFor(userId: string | null) {
 const hour = kstHour(), slot = slotOf(hour), mealsLeft = hour < 10 ? 3 : hour < 15 ? 2 : 1;
 let kcal = 2000, sodium = SODIUM_DAILY, carbsDay = 300, health: HealthFlag[] = [], excluded: ExcludedFood[] = [], personal = false;
 const eaten = {kcal: 0, sodium: 0, sugar: 0, carbs: 0, meals: 0};
 let recent: string[] = [];
 if (userId) {
  const ctx = await guideContext(userId);
  const profile = (await getPool().query('SELECT diet_preferences FROM body_profiles WHERE user_id=$1', [userId])).rows[0];
  const diet = parseDiet(profile?.diet_preferences);
  health = diet?.health ?? []; excluded = (diet?.excluded ?? []) as ExcludedFood[];
  if (ctx.guide.targets) { kcal = ctx.guide.targets.kcal; sodium = ctx.guide.targets.sodium; carbsDay = ctx.guide.targets.carbs[1]; personal = true; }
  else if (health.includes('pressure')) sodium = SODIUM_DAILY_PRESSURE;
  const logs = (await getPool().query<{product_name: string; calories: number | null; sodium: number | null; sugar: number | null; carbs: number | null; today: boolean}>(
   `SELECT product_name, calories::float8, sodium::float8, sugar::float8, carbs::float8,
     (created_at AT TIME ZONE 'Asia/Seoul')::date = (NOW() AT TIME ZONE 'Asia/Seoul')::date AS today
    FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND created_at > NOW() - INTERVAL '3 days'`, [userId])).rows;
  for (const l of logs) if (l.today) { eaten.meals++; eaten.kcal += l.calories ?? 0; eaten.sodium += l.sodium ?? 0; eaten.sugar += l.sugar ?? 0; eaten.carbs += l.carbs ?? 0; }
  recent = logs.map((l) => l.product_name.replace(/[\s_()]/g, ''));
 }
 // 오늘 기록이 없으면 앞 끼니는 보통으로 먹었다고 본다(하루 목표 ÷ 3). 한 끼 몫은 보통 한 끼의 0.6~1.4배 안에서.
 const perMeal = kcal / 3, logged = eaten.meals > 0;
 const clamp = (v: number, base: number) => Math.round(Math.min(base * 1.4, Math.max(base * .6, v)));
 const budget = {
  kcal: clamp(logged ? (kcal - eaten.kcal) / mealsLeft : perMeal, perMeal),
  sodium: clamp(logged ? (sodium - eaten.sodium) / mealsLeft : sodium / 3, sodium / 3),
  carbs: health.includes('glucose') ? 70 : clamp(logged ? (carbsDay - eaten.carbs) / mealsLeft : carbsDay / 3, carbsDay / 3),
 };
 const state: EatOutState = {slot, budget, eaten: {kcal: Math.round(eaten.kcal), sodium: Math.round(eaten.sodium), sugar: Math.round(eaten.sugar)}, health: health.map((h) => healthFlags[h].label), personal};
 return {state, health, excluded, recent};
}

// 1회 제공량이 없거나 너무 작으면(100mL 기준 등) 식당 1인분으로 맞춘다.
const TYPICAL_SERVING: Record<string, number> = {'찌개 및 전골류': 400, '국 및 탕류': 500, '면 및 만두류': 500, '밥류': 400, '죽 및 스프류': 400};
function restaurantServing(f: FoodReference): FoodReference {
 if (f.servingAmount >= 150) return f;
 const target = TYPICAL_SERVING[f.category ?? ''] ?? 250, k = target / f.servingAmount;
 const x = (v: number | null) => v === null ? null : Math.round(v * k * 10) / 10;
 return {...f, servingAmount: target, kcal: x(f.kcal), protein: x(f.protein), carbs: x(f.carbs), sugar: x(f.sugar), fat: x(f.fat), sodium: x(f.sodium)};
}

function judge(raw: FoodReference, s: Awaited<ReturnType<typeof stateFor>>): EatOutOption {
 const dish = restaurantServing(raw);
 const withRice = servedWithRice(dish);
 const add = (v: number | null, r: number) => v === null ? null : Math.round((v + (withRice ? r : 0)) * 10) / 10;
 const f = {...dish, kcal: add(dish.kcal, RICE.kcal), protein: add(dish.protein, RICE.protein), carbs: add(dish.carbs, RICE.carbs), sodium: add(dish.sodium, RICE.sodium)};
 const {budget} = s.state, pressure = s.health.includes('pressure'), glucose = s.health.includes('glucose');
 const kcal = f.kcal ?? budget.kcal, sodium = f.sodium ?? 0, carbs = f.carbs ?? 0, protein = f.protein ?? 0, sugar = f.sugar ?? 0;
 const reasons: string[] = [];
 let score = 100 - Math.abs(kcal - budget.kcal) / budget.kcal * 60;
 if (sodium > budget.sodium) { const over = sodium - budget.sodium; score -= over / 100 * (pressure ? 4 : 2); reasons.push(`나트륨 ${Math.round(sodium).toLocaleString('ko-KR')}mg — 이번 끼니 몫(${budget.sodium.toLocaleString('ko-KR')}mg)보다 많아요${s.state.eaten.sodium > 0 ? '. 오늘 이미 짜게 드셨어요' : ''}`); }
 else if (f.sodium !== null) reasons.push(`나트륨 ${Math.round(sodium).toLocaleString('ko-KR')}mg로 적당해요`);
 if (carbs > budget.carbs) { score -= (carbs - budget.carbs) * (glucose ? 1.2 : .4); if (glucose || carbs > budget.carbs * 1.3) reasons.push(`탄수화물 ${Math.round(carbs)}g — ${glucose ? '혈당 관리엔 많은 편이에요' : '밥·면이 많은 편이에요'}`); }
 if (kcal > budget.kcal * 1.3) reasons.push(`${Math.round(kcal).toLocaleString('ko-KR')}kcal — 이번 끼니 몫(${budget.kcal.toLocaleString('ko-KR')}kcal)보다 많아요`);
 else if (kcal < budget.kcal * .55) reasons.push(`${Math.round(kcal).toLocaleString('ko-KR')}kcal — 한 끼로는 가벼워요`);
 if (protein >= 25) { score += 8; reasons.push(`단백질 ${Math.round(protein)}g으로 든든해요`); }
 if (sugar > 25) { score -= (sugar - 25) * .8; reasons.push(`당류 ${Math.round(sugar)}g — 단 편이에요`); }
 const key = f.name.replace(/[\s_()]/g, '');
 if (s.recent.some((r) => r.includes(key) || key.includes(r))) { score -= 15; reasons.push('최근에 드신 메뉴예요'); }
 const verdict = score >= 70 ? 'good' : score >= 45 ? 'ok' : 'avoid';
 return {...f, verdict, reasons: reasons.slice(0, 3), score: Math.round(score), withRice};
}

// 같은 이름이 급식(소량)·외식(1인분) 등 여러 행이면 1회 제공량이 가장 큰(식당 1인분에 가까운) 것을 쓴다.
function largestPerName(list: FoodReference[]) {
 const best = new Map<string, FoodReference>();
 for (const f of list) { const k = f.name.replace(/\s/g, ''), prev = best.get(k); if (!prev || f.servingAmount > prev.servingAmount) best.set(k, f); }
 return [...best.values()];
}

// 사진: 음식 영양 사전엔 사진이 없어서, 홈 추천 메뉴(recipe_optimizer_results)에 모아 둔 음식 사진을 같은 코드(없으면 같은 이름)로 붙인다.
async function withImages(options: EatOutOption[]): Promise<EatOutOption[]> {
 if (!options.length) return options;
 const {rows} = await getPool().query<{food_code: string; image_url: string}>(
  `SELECT DISTINCT ON (f.food_code) f.food_code, r.image_url FROM food_reference f
    JOIN recipe_optimizer_results r ON r.image_url IS NOT NULL
     AND (r.food_code = f.food_code OR regexp_replace(r.target_name, '[\\s_()]', '', 'g') = regexp_replace(f.name, '[\\s_()]', '', 'g'))
   WHERE f.food_code = ANY($1) ORDER BY f.food_code, (r.food_code = f.food_code) DESC`, [options.map((o) => o.code)]);
 const image = new Map(rows.map((r) => [r.food_code, r.image_url]));
 return options.map((o) => ({...o, image: image.get(o.code) ?? null}));
}

const allowed = (f: FoodReference, excluded: ExcludedFood[]) => !excluded.some((k) => excludedFoodAliases[k].some((w) => f.name.includes(w)));

// 추천: 종류(선택)에 맞는 흔한 식당 메뉴 중 이번 끼니에 잘 맞는 3개. 매번 조금씩 다르게.
export async function suggestEatOut(userId: string | null, kind: EatOutKind | null) {
 const s = await stateFor(userId);
 const {rows} = await getPool().query(`SELECT food_code,name,brand,category,basis_amount,basis_unit,serving_amount,serving_unit,calories_kcal,protein_g,carbohydrates_g,sugar_g,fat_g,sodium_mg
  FROM food_reference WHERE category = ANY($1) AND brand IS NULL AND serving_amount >= 150 AND calories_kcal IS NOT NULL AND sodium_mg IS NOT NULL AND protein_g IS NOT NULL`, [MEAL_CATEGORIES]);
 const others = Object.values(EAT_OUT_KINDS).map((k) => k.match).filter(Boolean) as RegExp[];
 const pool = largestPerName(rows.map(foodReferenceFromRow)).filter((f) => allowed(f, s.excluded) && (f.kcal ?? 0) >= 250)
  // 식당 메뉴만: 라면·간편조리세트 같은 즉석식품은 뺀다.
  .filter((f) => !/라면|컵|즉석|간편조리|간편식|레토르트/.test(f.name))
  .filter((f) => kind === null ? f.category !== '빵 및 과자류' || /샌드위치|버거/.test(f.name) : kind === 'korean' ? !others.some((re) => re.test(f.name)) && f.category !== '빵 및 과자류' : EAT_OUT_KINDS[kind].match!.test(f.name));
 // 같은 음식 변형(떡볶이_어묵·떡볶이_채소…)은 하나만.
 const seen = new Set<string>();
 // 매번 조금씩 다르게: 메뉴마다 흔들림을 한 번만 정하고 그 값으로 정렬한다.
 const judged = pool.map((f) => ({f: judge(f, s), j: Math.random() * 18})).sort((a, b) => (b.f.score + b.j) - (a.f.score + a.j)).map((x) => x.f)
  .filter((f) => { const base = f.name.split(' ')[0].replace(/자장/g, '짜장').replace(/^간/, ''); if (seen.has(base)) return false; seen.add(base); return true; });
 return {state: s.state, options: await withImages(judged.slice(0, 3))};
}

// 비교: 고민 중인 메뉴 이름들을 사전에서 찾아 이번 끼니 기준으로 순위를 매긴다.
export async function compareEatOut(userId: string | null, names: string[]) {
 const s = await stateFor(userId);
 const found: EatOutOption[] = [], missing: string[] = [];
 for (const name of names.slice(0, 4)) {
  let hits = await searchFoodReference(name, 8);
  // "제육덮밥" → DB 이름 "덮밥_돼지고기(제육)": 음식 종류 단어를 떼어 두 단어로 다시 찾는다.
  if (!hits.length) { const m = name.replace(/\s/g, '').match(/^(.+?)(덮밥|볶음밥|비빔밥|국밥|찌개|전골|칼국수|국수|볶음|구이|조림|찜|탕|국|밥|면)$/); if (m) hits = await searchFoodReference(`${m[1]} ${m[2]}`, 8); }
  const first = hits.find((f) => !f.brand && f.kcal !== null) ?? hits.find((f) => f.kcal !== null);
  const pick = first && largestPerName(hits.filter((f) => f.kcal !== null && f.brand === first.brand && f.name.replace(/\s/g, '') === first.name.replace(/\s/g, '')))[0];
  if (pick) found.push(judge(pick, s)); else missing.push(name);
 }
 found.sort((a, b) => b.score - a.score);
 return {state: s.state, options: await withImages(found), missing};
}
