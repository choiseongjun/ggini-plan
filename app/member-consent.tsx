import { POLICY_EMAIL } from '../lib/member-policy';
import './legal.css';

export type ConsentChecks = { terms: boolean; privacy: boolean; age14: boolean };
export const emptyConsent: ConsentChecks = { terms: false, privacy: false, age14: false };

export function MemberConsentFields({ value, onChange, disabled }: {
  value: ConsentChecks;
  onChange: (value: ConsentChecks) => void;
  disabled: boolean;
}) {
  return <fieldset className="member-consent" disabled={disabled}>
    <legend>회원가입 필수 동의</legend>
    <label><input type="checkbox" checked={value.age14} onChange={event => onChange({ ...value, age14: event.target.checked })}/><span>[필수] 만 14세 이상입니다.</span></label>
    <label><input type="checkbox" checked={value.terms} onChange={event => onChange({ ...value, terms: event.target.checked })}/><span>[필수] 이용약관에 동의합니다. <a href="/terms" target="_blank" rel="noopener noreferrer">전문 보기 ↗</a></span></label>
    <label><input type="checkbox" checked={value.privacy} onChange={event => onChange({ ...value, privacy: event.target.checked })}/><span>[필수] 회원가입 개인정보 수집·이용에 동의합니다. <a href="/privacy#membership" target="_blank" rel="noopener noreferrer">내용 보기 ↗</a></span></label>
    <p>이름·이메일·비밀번호 해시(이메일 가입) 또는 구글 계정 식별자(구글 가입), 동의 이력을 회원 식별·로그인·계정 관리에 사용하며 탈퇴 처리 시까지 보관합니다. 동의를 거부하면 가입이 제한되며 비회원 둘러보기는 가능합니다. 신체·건강정보나 마케팅 수신 동의는 포함하지 않습니다.</p>
    <p>운영자 최성준 · 개인정보 문의 {POLICY_EMAIL}</p>
  </fieldset>;
}
