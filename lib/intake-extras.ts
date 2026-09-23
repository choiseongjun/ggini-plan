// "함께 먹은 것" quick-add items for the eaten-meal log. Typical single servings (rounded reference values
// from the 식약처 food composition DB and common product labels) — an estimate, not a measurement.
export const intakeExtras = {
  "rice-half": { label: "밥 반 공기", calories: 155, protein: 2.8 },
  "rice-full": { label: "밥 한 공기", calories: 310, protein: 5.6 },
  "egg-fried": { label: "계란후라이", calories: 110, protein: 6.5 },
  kimchi: { label: "김치", calories: 15, protein: 0.8 },
  gim: { label: "김 한 봉", calories: 25, protein: 1.2 },
  fruit: { label: "과일 한 접시", calories: 80, protein: 0.8 },
  snack: { label: "과자 한 줌", calories: 160, protein: 2 },
  soda: { label: "탄산음료 1캔", calories: 140, protein: 0 },
  beer: { label: "맥주 1캔", calories: 150, protein: 1.2 },
  soju: { label: "소주 반 병", calories: 200, protein: 0 },
} as const;
export type IntakeExtra = keyof typeof intakeExtras;
export const isIntakeExtra = (value: unknown): value is IntakeExtra => typeof value === "string" && Object.hasOwn(intakeExtras, value);
export const EXTRA_PREFIX = "extra:";
