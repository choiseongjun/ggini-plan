import { excludedFoods } from './excluded-foods';

export const allergyStatuses = {
  unknown: '미확인', partial: '일부 확인 · 추가 확인 필요',
  ingredients: '원재료 확인 · 함유 표시 미확인', verified: '함유 표시 확인',
} as const;
export type AllergyInfo = {
  status: keyof typeof allergyStatuses;
  statement: string;
  note: string;
  sourceUrl: string | null;
  evidenceUrls: string[];
  crossContactNote: string;
};
export const emptyAllergyInfo: AllergyInfo = {
  status: 'unknown', statement: '', note: '', sourceUrl: null, evidenceUrls: [],
  crossContactNote: '제조시설·혼입 가능성은 원문 표시사항 확인 필요',
};
export const allergenOptions: Record<string, string> = {
  ...excludedFoods, peach: '복숭아', sulfites: '아황산류·이산화황',
};

export function validateAllergens(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > Object.keys(allergenOptions).length ||
      value.some(key => typeof key !== 'string' || !Object.hasOwn(allergenOptions, key)))
    throw new Error('알레르기 성분 목록을 확인해 주세요.');
  return [...new Set(value)] as string[];
}
export function validateAllergyInfo(value: unknown): AllergyInfo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('알레르기 정보 형식을 확인해 주세요.');
  const v = value as Record<string, unknown>;
  if (typeof v.status !== 'string' || !Object.hasOwn(allergyStatuses, v.status)) throw new Error('알레르기 확인 상태를 선택해 주세요.');
  for (const field of ['statement', 'note', 'crossContactNote']) {
    if (typeof v[field] !== 'string' || v[field].length > 2000) throw new Error('알레르기 문구는 2000자 이하로 입력해 주세요.');
  }
  const url = (input: unknown) => {
    if (typeof input !== 'string' || input.length > 2048) throw new Error('알레르기 출처 링크를 확인해 주세요.');
    try { if (new URL(input).protocol === 'https:') return input; } catch {}
    throw new Error('알레르기 출처는 HTTPS 링크여야 합니다.');
  };
  const sourceUrl = v.sourceUrl === null || v.sourceUrl === '' ? null : url(v.sourceUrl);
  if (!Array.isArray(v.evidenceUrls) || v.evidenceUrls.length > 20) throw new Error('알레르기 근거 링크를 확인해 주세요.');
  const evidenceUrls = v.evidenceUrls.map(url);
  if (v.status !== 'unknown' && !sourceUrl) throw new Error('알레르기 정보를 확인했다면 출처 링크를 입력해 주세요.');
  if (v.status === 'verified' && !(v.statement as string).trim()) throw new Error('알레르기 함유 표시 원문을 입력해 주세요.');
  return { status: v.status as AllergyInfo['status'], statement: (v.statement as string).trim(), note: (v.note as string).trim(), crossContactNote: (v.crossContactNote as string).trim(), sourceUrl, evidenceUrls };
}
