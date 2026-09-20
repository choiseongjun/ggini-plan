export const MEMBER_POLICY_VERSION = '2026-09-20';
export const POLICY_OPERATOR = '최성준';
export const POLICY_EMAIL = 'choisj2702@gmail.com';

export type MemberConsent = {
  terms: true;
  privacy: true;
  age14: true;
  version: typeof MEMBER_POLICY_VERSION;
};

export function validMemberConsent(value: unknown): value is MemberConsent {
  if (!value || typeof value !== 'object') return false;
  const consent = value as Record<string, unknown>;
  return consent.terms === true && consent.privacy === true && consent.age14 === true && consent.version === MEMBER_POLICY_VERSION;
}
