import {getPool} from './db';
import {activities, calorieEstimate, parseBodyProfile} from './body-profile';
import {dailyNutritionReference} from './daily-nutrition-reference';
import {parseDiet, excludedFoods} from './meal-plan';
import {parseNutritionTarget} from './nutrition-target';
import {isShoppingGoal, shoppingGoals, type ShoppingGoal} from './shopping-goals';
import {servingNutrients} from './serving-nutrients';
import {planProducts} from './shopping-plan-catalog';
import {healthFlags, SODIUM_DAILY, SODIUM_DAILY_PRESSURE, type HealthFlag} from './today-context';

// "이번 주 이렇게 드세요": 신체 정보·목표·건강 관리 여부·최근 7일 기록으로 규칙 기반 가이드를 만든다(AI 없음, 늘 같은 결과).
// 진단·처방이 아니라 일반적인 식사 안내다. 기준은 2025 한국인 영양소 섭취기준(daily-nutrition-reference).
export type WeeklyGuide = {
 hasProfile: boolean;
 goal: string;
 headline: string;
 points: string[];
 targets: {kcal: number; perMealKcal: number; protein: number; carbs: [number, number]; fat: [number, number]; sodium: number; sugar: number} | null;
 recent: {days: number; kcal: number; protein: number; carbs: number; sodium: number; sugar: number} | null;
 focus: {title: string; detail: string}[];
 eatMore: string[];
 eatLess: string[];
 plate: string[];
 weight: {change: number; weeks: number} | null;
 health: string[];
 /** AI 가이드가 쓴 문장이면 true(숫자 목표는 늘 규칙 계산). */
 ai?: boolean;
};

// AI 가이드에 넘길 입력과, 다시 만들지 판단하는 키(서버 내부용).
export type GuideContext = {guide: WeeklyGuide; input: Record<string, unknown> | null; profileKey: string; recentKey: string};

type Log = {day: string; product_id: string; portions: number; calories: number | null; protein: number | null; carbs: number | null; sugar: number | null; sodium: number | null};

export async function weeklyGuide(userId: string): Promise<WeeklyGuide> { return (await guideContext(userId)).guide; }

export async function guideContext(userId: string): Promise<GuideContext> {
 const db = getPool();
 const [profileRow, prefRow, logs, weights, topMenus] = await Promise.all([
  db.query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,diet_preferences,nutrition_target FROM body_profiles WHERE user_id=$1', [userId]).then((r) => r.rows[0]),
  db.query('SELECT conditions FROM shopping_preferences WHERE user_id=$1', [userId]).then((r) => r.rows[0]),
  db.query<Log>(`SELECT to_char(created_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AS day, product_id, portions::float8, calories::float8, protein::float8, carbs::float8, sugar::float8, sodium::float8
   FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND created_at > NOW() - INTERVAL '7 days'`, [userId]).then((r) => r.rows),
  db.query<{day: string; weight_kg: string}>(`SELECT day::text, weight_kg FROM weight_logs WHERE user_id=$1 AND day > CURRENT_DATE - 60 ORDER BY day`, [userId]).then((r) => r.rows),
  db.query<{name: string}>(`SELECT max(product_name) AS name FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND created_at > NOW() - INTERVAL '14 days' AND product_id NOT LIKE 'extra:%' GROUP BY product_id ORDER BY count(*) DESC LIMIT 8`, [userId]).then((r) => r.rows.map((x) => x.name.split('_').join(' '))),
 ]);
 const profile = parseBodyProfile(profileRow);
 const goal: ShoppingGoal = isShoppingGoal(prefRow?.conditions?.goal) ? prefRow.conditions.goal : 'maintain';
 const diet = parseDiet(profileRow?.diet_preferences);
 const health: HealthFlag[] = diet?.health ?? [];
 const excluded = (diet?.excluded ?? []).map((k) => excludedFoods[k]);
 const empty = {hasProfile: false, goal: shoppingGoals[goal].label, headline: '', points: [], targets: null, recent: null, focus: [], eatMore: [], eatLess: [], plate: [], weight: null, health: health.map((h) => healthFlags[h].label)};
 if (!profile || profile.pregnancy) return {guide: {...empty, headline: profile?.pregnancy ? '임신·수유 중에는 개인별 영양 상담을 권해요.' : '내 정보를 입력하면 이번 주 식단 가이드를 드려요.'}, input: null, profileKey: '', recentKey: ''};

 // 목표: 직접 정한 칼로리 목표 → 없으면 신체 정보로 계산한 유지 열량.
 const reference = dailyNutritionReference(profileRow)!;
 const manual = parseNutritionTarget(profileRow?.nutrition_target);
 const kcal = manual?.calories ?? calorieEstimate(profile)!.daily;
 const meals = profile.meals || 3;
 const proteinGoal = goal === 'muscle' ? Math.round(profile.weight * 1.6) : goal === 'lose' ? Math.max(reference.protein, Math.round(profile.weight * 1.2)) : reference.protein;
 const sodiumLimit = health.includes('pressure') ? SODIUM_DAILY_PRESSURE : SODIUM_DAILY;
 const targets = {
  kcal, perMealKcal: Math.round(kcal / meals), protein: proteinGoal,
  carbs: (goal === 'lowcarb' || health.includes('glucose') ? [kcal * .35 / 4, kcal * .5 / 4] : reference.carbs).map(Math.round) as [number, number],
  fat: reference.fat.map(Math.round) as [number, number],
  sodium: sodiumLimit, sugar: Math.round(kcal * .1 / 4),
 };

 // 최근 7일: 기록한 날의 하루 평균. 예전 기록은 탄수·나트륨이 없어 메뉴 영양값으로 추정한다.
 const products = new Map((await planProducts()).map((p) => [p.id, p]));
 const byDay = new Map<string, {kcal: number; protein: number; carbs: number; sodium: number; sugar: number}>();
 for (const l of logs) {
  const d = byDay.get(l.day) ?? {kcal: 0, protein: 0, carbs: 0, sodium: 0, sugar: 0};
  const n = products.has(l.product_id) ? servingNutrients(products.get(l.product_id)!) : null;
  d.kcal += l.calories ?? 0; d.protein += l.protein ?? 0;
  d.carbs += l.carbs ?? (n?.carbs ?? 0) * l.portions; d.sodium += l.sodium ?? (n?.sodium ?? 0) * l.portions; d.sugar += l.sugar ?? 0;
  byDay.set(l.day, d);
 }
 const days = [...byDay.values()];
 const avg = (k: keyof typeof days[number]) => Math.round(days.reduce((s, d) => s + d[k], 0) / Math.max(1, days.length));
 const recent = days.length >= 2 ? {days: days.length, kcal: avg('kcal'), protein: avg('protein'), carbs: avg('carbs'), sodium: avg('sodium'), sugar: avg('sugar')} : null;

 const w = weights.length >= 2 ? {first: weights[0], last: weights.at(-1)!} : null;
 const weight = w ? {change: Math.round((Number(w.last.weight_kg) - Number(w.first.weight_kg)) * 10) / 10, weeks: Math.max(1, Math.round((Date.parse(w.last.day) - Date.parse(w.first.day)) / (7 * 86400000)))} : null;

 // 이번 주 집중할 것: 건강 관리 → 최근 기록에서 벗어난 것 → 목표 순으로 최대 3개.
 const focus: {title: string; detail: string}[] = [];
 const eatMore = new Set<string>(), eatLess = new Set<string>();
 if (health.includes('glucose')) { focus.push({title: '탄수화물은 한 끼 70g 안쪽으로', detail: '밥은 2/3공기, 흰밥보다 잡곡밥을 권해요. 채소·단백질을 먼저 먹고 밥은 나중에 먹으면 혈당이 덜 올라요. 단 음료·디저트는 식후에 한 번만.'}); ['잡곡밥', '채소 반찬', '두부·달걀'].forEach((x) => eatMore.add(x)); ['단 음료', '흰 빵·떡', '과일 주스'].forEach((x) => eatLess.add(x)); }
 if (health.includes('pressure')) { focus.push({title: `나트륨은 하루 ${sodiumLimit.toLocaleString('ko-KR')}mg 이하로`, detail: '국·찌개는 국물을 절반만, 라면·젓갈·장아찌는 주 1~2번으로. 구이·찜처럼 국물 없는 메뉴를 늘려요.'}); ['구이·찜 요리', '신선 채소', '바나나·감자(칼륨)'].forEach((x) => eatMore.add(x)); ['라면', '국물 끝까지', '젓갈·장아찌'].forEach((x) => eatLess.add(x)); }
 if (recent) {
  if (recent.protein < targets.protein * .8) { focus.push({title: `단백질을 하루 ${targets.protein}g까지`, detail: `최근 하루 평균 ${recent.protein}g이에요. 끼니마다 손바닥 크기의 고기·생선·두부나 달걀 2개를 넣어 주세요.`}); ['달걀', '두부', '닭가슴살', '생선'].forEach((x) => eatMore.add(x)); }
  if (!health.includes('pressure') && recent.sodium > sodiumLimit * 1.2) { focus.push({title: '짠 음식을 조금 줄여요', detail: `최근 하루 나트륨이 약 ${recent.sodium.toLocaleString('ko-KR')}mg으로 권장량(${sodiumLimit.toLocaleString('ko-KR')}mg)보다 많아요. 국물은 절반만 드세요.`}); ['국물', '라면'].forEach((x) => eatLess.add(x)); }
  if (recent.sugar > targets.sugar) { focus.push({title: '단 음료·디저트를 줄여요', detail: `최근 하루 당류가 약 ${recent.sugar}g이에요(권장 ${targets.sugar}g 이하). 라떼·음료는 시럽 없이, 디저트는 주 2~3번으로.`}); ['시럽 음료', '케이크·쿠키'].forEach((x) => eatLess.add(x)); }
  if (recent.kcal > kcal * 1.15 && goal === 'lose') focus.push({title: '하루 섭취가 목표보다 많아요', detail: `최근 하루 약 ${recent.kcal.toLocaleString('ko-KR')}kcal예요(목표 ${kcal.toLocaleString('ko-KR')}kcal). 간식·음료부터 줄이는 게 가장 쉬워요.`});
 }
 if (goal === 'lose') { focus.push({title: `한 끼 ${targets.perMealKcal}kcal 안팎으로`, detail: '튀김·전은 주 1~2번, 밥은 2/3공기. 단백질을 먼저 챙기면 덜 배고파요.'}); ['채소', '살코기', '두부'].forEach((x) => eatMore.add(x)); ['튀김·전', '야식'].forEach((x) => eatLess.add(x)); }
 if (goal === 'muscle') { focus.push({title: `단백질 하루 ${targets.protein}g`, detail: `체중 1kg당 1.6g 기준이에요. 끼니마다 30g 이상, 운동한 날은 간식으로 달걀·그릭요거트를 더해요.`}); ['닭가슴살', '소고기 살코기', '그릭요거트'].forEach((x) => eatMore.add(x)); }
 if (goal === 'lowcarb') { focus.push({title: '밥·면은 반으로', detail: '밥은 반 공기, 면 요리는 주 1~2번. 구이·볶음처럼 단백질이 중심인 메뉴를 골라요.'}); ['구이·볶음 메인', '채소'].forEach((x) => eatMore.add(x)); ['면 요리', '떡·빵'].forEach((x) => eatLess.add(x)); }
 if (!focus.length) focus.push({title: '끼니마다 단백질·채소·밥을 골고루', detail: '끼니마다 단백질 한 가지(고기·생선·두부·달걀), 채소 두 가지, 밥 한 공기를 기본으로 해요. 생선은 주 2번 이상이면 좋아요.'});
 // 기본 안내(특별히 줄일 게 없을 때도 비어 보이지 않게).
 if (!eatMore.size) ['채소 두 가지', '생선 주 2번', '잡곡밥'].forEach((x) => eatMore.add(x));
 if (!eatLess.size) ['튀김·전은 주 1~2번', '단 음료', '국물 끝까지 먹기'].forEach((x) => eatLess.add(x));
 if (!recent) focus.push({title: '먹은 걸 3일 이상 기록해 보세요', detail: '기록이 쌓이면 이 가이드가 내 실제 식사에 맞춰 바뀌어요. 알림의 [먹었어요] 한 번이면 돼요.'});

 const plate = health.includes('glucose') || goal === 'lowcarb' || goal === 'lose'
  ? ['단백질: 손바닥 크기 1개(고기·생선·두부)', '채소: 두 가지 이상, 먼저 먹기', '밥: 2/3공기 이하(잡곡밥이면 더 좋아요)']
  : goal === 'muscle' ? ['단백질: 손바닥 크기 1.5개', '밥: 한 공기', '채소: 한두 가지'] : ['단백질: 손바닥 크기 1개', '밥: 한 공기', '채소: 두 가지'];

 // 기록이 부족하면 '기록하기' 안내는 꼭 보이게(1순위 목표).
 const nudge = focus.find((f) => f.title.startsWith('먹은 걸'));
 const top = nudge && !focus.slice(0, 3).includes(nudge) ? [...focus.slice(0, 2), nudge] : focus.slice(0, 3);
 const headline = health.length ? `${health.map((h) => healthFlags[h].label).join('·')}에 맞춘 이번 주 식사 가이드예요.`
  : recent ? `최근 ${recent.days}일 기록을 보고 이번 주에 챙길 것을 골랐어요.`
  : `${shoppingGoals[goal].label} 기준으로 하루 ${kcal.toLocaleString('ko-KR')}kcal, 단백질 ${targets.protein}g을 목표로 해요.`;
 const guide: WeeklyGuide = {
  hasProfile: true, goal: shoppingGoals[goal].label, headline, points: top.map((f) => f.title), targets, recent, focus: top,
  eatMore: [...eatMore].slice(0, 6), eatLess: [...eatLess].slice(0, 6), plate, weight, health: health.map((h) => healthFlags[h].label),
 };
 const input = {
  profile: {age: profile.age, sex: profile.sex === 'male' ? '남성' : '여성', heightCm: profile.height, weightKg: profile.weight, activity: activities[profile.activity].label, mealsPerDay: meals},
  goal: shoppingGoals[goal].label, health: guide.health, avoidFoods: excluded, dailyTargets: targets, recent7Days: recent, weightChange: weight, frequentlyEaten: topMenus,
 };
 const profileKey = JSON.stringify([input.profile, goal, health, excluded, targets]);
 const recentKey = recent ? [recent.days, Math.round(recent.kcal / 150), Math.round(recent.protein / 10), Math.round(recent.sodium / 400), Math.round(recent.sugar / 10), weight?.change ?? ''].join('|') : 'none';
 return {guide, input, profileKey, recentKey};
}
