import { type CatalogItem, type CompareResponse, shoppingSearchLinks, unitPrice } from './catalog';
import { addDays, type DashboardData } from './dashboard';
import { defaultDiet, recommendMeals } from './meal-plan';

// Illustrative prices; search links do not imply verified live offers.
const groceries = [
  ['chicken', '닭가슴살', '🍗', 10900, 1000, 'g', 'ingredient'],
  ['rice', '현미 즉석밥', '🍚', 8900, 1260, 'g', 'ready_meal'],
  ['eggs', '달걀 10구', '🥚', 4200, 10, '개', 'ingredient'],
  ['tofu', '두부 2모', '🥡', 3200, 600, 'g', 'ingredient'],
  ['broccoli', '냉동 브로콜리', '🥦', 5900, 1000, 'g', 'ingredient'],
  ['yogurt', '플레인 그릭요거트', '🥣', 6500, 450, 'g', 'ready_meal'],
  ['banana', '바나나', '🍌', 3900, 1000, 'g', 'ingredient'],
  ['oats', '오트밀', '🌾', 4900, 500, 'g', 'ingredient'],
  ['pasta', '토마토 파스타 밀키트', '🍝', 9900, 600, 'g', 'meal_kit'],
  ['dumplings', '냉동 만두', '🥟', 7900, 700, 'g', 'frozen_meal'],
  ['salad', '샐러드 채소', '🥗', 4900, 300, 'g', 'ingredient'],
  ['soup', '된장찌개 밀키트', '🍲', 6900, 500, 'g', 'meal_kit'],
] as const;
export const guestProducts: CatalogItem[] = groceries.map(([id, name, emoji, price, quantity, unit, category], index) => ({
  id: `sample-${id}`, name, emoji, price, quantity, unit, category,
  isSample: true, detail: `${quantity.toLocaleString('ko-KR')}${unit}`, portions: '예시 구성',
  protein: '미확인', color: ['green', 'yellow', 'peach'][index % 3], searchQuery: name,
  inWeeklyCart: index < 8, productImageUrl: null, productUrl: null,
  priceNote: '둘러보기용 샘플 가격 · 실제 판매가 아님', priceCheckedAt: null,
  nutritionSourceName: null, nutritionSourceUrl: null, nutritionPhotoUrl: null,
  nutritionBasis: null, caloriesKcal: null, proteinG: null, carbohydratesG: null,
  fatG: null, sodiumMg: null, updatedAt: null,
}));
export function guestDashboard(now = new Date()): DashboardData {
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const week = addDays(today, -((weekday + 6) % 7));
  const profile = { height: 165, weight: 60, age: 28, sex: 'female' as const, activity: 'light' as const, meals: 3, pregnancy: false };
  const plans = Array.from({ length: 7 }, (_, i) => ({
    id: `sample-plan-${i}`, date: addDays(week, i),
    recommendation: recommendMeals(profile, { ...defaultDiet, style: i % 2 ? 'quick' : 'balanced' }, i)!,
  }));
  const expenses: DashboardData['expenses'] = [];
  for (let i = -21; i <= 6; i++) {
    const date = addDays(week, i);
    if (date > today) continue;
    expenses.push({ date, category: 'food', amount: [6200, 8500, 4900, 11000, 7800, 13500, 5900][(i + 21) % 7] });
    if (i % 3 === 0) expenses.push({ date, category: 'transport', amount: 3000 });
    if (i % 7 === 0) expenses.push({ date, category: 'household', amount: 6900 });
  }
  return { today, week, budget: 90000, plans, expenses, isSample: true };
}
export function guestComparison(product: CatalogItem): CompareResponse {
  return { status: 'unavailable', itemId: product.id, checkedAt: null,
    offers: shoppingSearchLinks(product.searchQuery).map((link, i) => ({
      id: `${product.id}-${i}`, seller: link.name, title: `${product.name} · 샘플 가격`,
      price: product.price, quantity: product.quantity, unit: product.unit,
      unitPrice: unitPrice(product.price, product.quantity, product.unit), url: link.url, isSearchLink: true,
    })), message: '둘러보기용 예시 가격이에요. 각 쇼핑몰의 실제 검색 결과에서 현재 가격을 확인해 주세요.' };
}
