import { EXTRA_PREFIX } from "./intake-extras";

export type StatLog = { productId: string; name: string; calories: number | null; protein: number | null; cost: number | null; date: string };

const addDays = (date: string, n: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekStart = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const isMeal = (l: StatLog) => !l.productId.startsWith(EXTRA_PREFIX);

// Streak = consecutive days with at least one log. Each Mon–Sun week grants one 쉬기권 that silently
// covers a single missed day, so one busy day doesn't wipe out weeks of habit. Today not logged yet
// doesn't break anything — the streak just hasn't been extended today.
export function streakFrom(logged: Set<string>, until: string) {
  const usedWeeks = new Set<string>();
  let count = 0, day = logged.has(until) ? until : addDays(until, -1);
  const frozen: string[] = [];
  for (let i = 0; i < 400; i++) {
    if (logged.has(day)) count++;
    // Also covers a missed yesterday while today is still open; an unprotected leading freeze is dropped below.
    else if (!usedWeeks.has(weekStart(day)) && (count > 0 || day === addDays(until, -1))) { usedWeeks.add(weekStart(day)); frozen.push(day); }
    else break;
    day = addDays(day, -1);
  }
  // A freeze at the very start of the run isn't protecting anything.
  while (frozen.length && !logged.has(addDays(frozen[frozen.length - 1], -1))) frozen.pop();
  return { count, frozen };
}

export function intakeStats(logs: StatLog[], today: string, goals: { calories: number | null; protein: number | null }) {
  const days = new Set(logs.map(l => l.date));
  const current = streakFrom(days, today);
  // Best streak: the longest run ending on any logged day (history is small, so a scan is fine).
  let best = current.count;
  for (const d of days) if (!days.has(addDays(d, 1))) best = Math.max(best, streakFrom(days, d).count);
  const thisWeek = weekStart(today);
  const freezeUsedThisWeek = current.frozen.some(d => weekStart(d) === thisWeek);

  const meals = logs.filter(isMeal);
  const byDay = new Map<string, { calories: number; protein: number; meals: number }>();
  for (const l of logs) { const d = byDay.get(l.date) ?? { calories: 0, protein: 0, meals: 0 }; d.calories += l.calories ?? 0; d.protein += l.protein ?? 0; if (isMeal(l)) d.meals++; byDay.set(l.date, d); }
  const proteinDays = goals.protein ? [...byDay.values()].filter(d => d.protein >= goals.protein! * 0.9).length : 0;
  const weekMeals = new Map<string, number>();
  for (const l of meals) weekMeals.set(weekStart(l.date), (weekMeals.get(weekStart(l.date)) ?? 0) + 1);
  const bestWeek = Math.max(0, ...weekMeals.values());
  const distinct = new Set(meals.map(l => l.productId.split("--")[0])).size;
  const cooked = meals.filter(l => l.productId.startsWith("recipe-")).length;

  // A ladder: the next badge is always within reach.
  const badges = [
    { key: "first", label: "첫 기록", description: "첫 끼니를 기록했어요", progress: Math.min(1, meals.length), goal: 1, icon: "bowl", tone: "mint" },
    { key: "streak3", label: "3일 연속", description: "3일 연속으로 기록", progress: Math.min(3, best), goal: 3, icon: "flame", tone: "peach" },
    { key: "streak7", label: "일주일 개근", description: "7일 연속으로 기록", progress: Math.min(7, best), goal: 7, icon: "flame", tone: "peach" },
    { key: "variety10", label: "새 메뉴 탐험가", description: "서로 다른 메뉴 10가지", progress: Math.min(10, distinct), goal: 10, icon: "sprout", tone: "lemon" },
    { key: "week14", label: "알찬 한 주", description: "한 주에 14끼 기록", progress: Math.min(14, bestWeek), goal: 14, icon: "scale", tone: "sky" },
    { key: "protein5", label: "단백질 챙김이", description: "단백질 목표를 채운 날 5일", progress: Math.min(5, proteinDays), goal: 5, icon: "egg", tone: "pink" },
    { key: "cook10", label: "집밥 요리사", description: "직접 요리한 메뉴 10번", progress: Math.min(10, cooked), goal: 10, icon: "bowl", tone: "lilac" },
    { key: "streak30", label: "한 달 습관", description: "30일 연속으로 기록", progress: Math.min(30, best), goal: 30, icon: "flag", tone: "mint" },
    { key: "meals100", label: "100끼 달성", description: "누적 100끼 기록", progress: Math.min(100, meals.length), goal: 100, icon: "bolt", tone: "sky" },
  ].map(b => ({ ...b, earned: b.progress >= b.goal }));

  return {
    streak: { current: current.count, loggedToday: days.has(today), best, freezeAvailable: !freezeUsedThisWeek, freezeUsedOn: current.frozen },
    badges,
    week: weeklyReport(logs, thisWeek, goals),
    lastWeek: weeklyReport(logs, addDays(thisWeek, -7), goals),
  };
}

// A Mon–Sun summary of what was actually logged; "다음 주 팁" comes from the biggest gap.
export function weeklyReport(logs: StatLog[], start: string, goals: { calories: number | null; protein: number | null }) {
  const end = addDays(start, 6);
  const week = logs.filter(l => l.date >= start && l.date <= end);
  const meals = week.filter(isMeal);
  const days = [...new Set(week.map(l => l.date))];
  const perDay = days.map(d => { const ls = week.filter(l => l.date === d); return { calories: ls.reduce((s, l) => s + (l.calories ?? 0), 0), protein: ls.reduce((s, l) => s + (l.protein ?? 0), 0) }; });
  const avgCalories = perDay.length ? Math.round(perDay.reduce((s, d) => s + d.calories, 0) / perDay.length) : null;
  const avgProtein = perDay.length ? Math.round(perDay.reduce((s, d) => s + d.protein, 0) / perDay.length) : null;
  const proteinDays = goals.protein ? perDay.filter(d => d.protein >= goals.protein! * 0.9).length : null;
  const counts = new Map<string, number>();
  for (const l of meals) counts.set(l.name, (counts.get(l.name) ?? 0) + 1);
  const favorite = [...counts].sort((a, b) => b[1] - a[1])[0] ?? null;
  const spent = Math.round(meals.reduce((s, l) => s + (l.cost ?? 0), 0));
  const extras = week.length - meals.length;
  const tip = !days.length ? null
    : goals.protein && avgProtein !== null && avgProtein < goals.protein * 0.8 ? { kind: "protein", text: "단백질이 목표보다 적었어요. 다음 주는 고기·생선·두부 메뉴를 한두 끼 더 넣어 보세요." }
    : goals.calories && avgCalories !== null && avgCalories > goals.calories * 1.1 && days.length >= 3 ? { kind: "over", text: "기록한 날 칼로리가 목표보다 많았어요. 국물·튀김 메뉴를 줄이면 쉽게 맞출 수 있어요." }
    : extras >= days.length * 2 ? { kind: "extras", text: "함께 먹은 간식·음료가 많았어요. 음료 한 잔만 줄여도 하루 100~150kcal가 줄어요." }
    : days.length < 4 ? { kind: "habit", text: "기록한 날이 아직 적어요. 저녁 한 끼만이라도 사진으로 남겨 보세요." }
    : { kind: "good", text: "목표에 맞게 잘 챙겨 먹었어요. 다음 주도 이대로 가 봐요!" };
  return { start, end, days: days.length, meals: meals.length, extras, avgCalories, avgProtein, proteinDays, favorite: favorite ? { name: favorite[0], count: favorite[1] } : null, spent, tip };
}
export type IntakeStats = ReturnType<typeof intakeStats>;
