import Link from 'next/link';
import type { ReactNode } from 'react';
import { MEMBER_POLICY_VERSION, POLICY_EMAIL, POLICY_OPERATOR } from '../lib/member-policy';
import './legal.css';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return <main className="legal-page">
    <header><Link href="/" className="legal-brand">끼니플랜</Link><nav aria-label="회원 정책"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link></nav></header>
    <article><p className="legal-kicker">회원 정책</p><h1>{title}</h1><p className="legal-date">회원 동의 버전 {MEMBER_POLICY_VERSION}</p>
      {children}
      <footer>운영자·개인정보 보호책임자: {POLICY_OPERATOR}<br/>문의: <a href={`mailto:${POLICY_EMAIL}`}>{POLICY_EMAIL}</a></footer>
    </article>
  </main>;
}
