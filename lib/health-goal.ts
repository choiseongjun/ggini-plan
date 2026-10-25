import type { BodyGoal } from './nutrition-plan';

export const healthModes = {
  lose: { label: '체중 감량', description: '먹은 양과 하루 섭취 흐름을 살펴봐요.', focus: '칼로리와 식사량을 함께 확인해요.' },
  muscle: { label: '근육 증가', description: '끼니마다 단백질을 얼마나 챙겼는지 봐요.', focus: '단백질과 하루 전체 섭취량을 확인해요.' },
  maintain: { label: '건강 유지', description: '부담 없이 기록하고 식사 균형을 살펴봐요.', focus: '탄수화물·단백질·지방의 균형을 확인해요.' },
} satisfies Record<BodyGoal, { label: string; description: string; focus: string }>;
export function isHealthGoal(value: unknown): value is BodyGoal {
  return value === 'lose' || value === 'muscle' || value === 'maintain';
}
