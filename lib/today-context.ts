// 추천 엔진이 쓰는 '지금의 나': 오늘 이미 먹은 양, 최근에 먹은 메뉴, 관리 중인 건강 상태.
// 사용자가 매번 입력하지 않는다 — 먹은 기록(원탭·사진)과 신체 정보에서 서버가 모아 보낸다.
export type HealthFlag = 'glucose' | 'pressure';
export const healthFlags: Record<HealthFlag, {label: string; description: string}> = {
  glucose: {label: '혈당 관리', description: '탄수화물이 많은 메뉴를 덜 추천해요'},
  pressure: {label: '혈압 관리', description: '국물·짠 메뉴를 덜 추천해요'},
};
export const isHealthFlag = (value: unknown): value is HealthFlag => value === 'glucose' || value === 'pressure';

export type TodayContext = {
  /** KST 날짜(YYYY-MM-DD). 식단 시작일이 이 날이면 1일차가 '오늘'이다. */
  day: string;
  /** 오늘 이미 먹은 양. meals는 메뉴(곁들임 제외) 기록 수. */
  eaten: {kcal: number; sodium: number; carbs: number; sugar: number; meals: number};
  dailyKcal: number | null;
  perMealKcal: number | null;
  mealsPerDay: number;
  health: HealthFlag[];
  /** 최근 3일 동안 먹은 메뉴 id(오늘 포함). */
  recent: string[];
};

export const SODIUM_DAILY = 2000, SODIUM_DAILY_PRESSURE = 1500;
