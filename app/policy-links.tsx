import Link from 'next/link';
import './legal.css';

export function PolicyLinks() {
  return <nav className="policy-links" aria-label="회원 정책"><Link prefetch={false} href="/intro">끼니플랜 소개</Link><Link prefetch={false} href="/terms">이용약관</Link><Link prefetch={false} href="/privacy">개인정보처리방침</Link><Link prefetch={false} href="/delete-account">회원 탈퇴·데이터 삭제</Link><a href="mailto:choisj2702@gmail.com">문의</a></nav>;
}
