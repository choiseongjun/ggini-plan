import Link from 'next/link';
import type { ReactNode } from 'react';
import { MEMBER_POLICY_VERSION, POLICY_EMAIL, POLICY_OPERATOR } from '../lib/member-policy';
import './legal.css';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return <main className="legal-page">
    <header><Link href="/" className="legal-brand">끼니플랜</Link><nav aria-label="회원 정책"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link></nav></header>
    <article><p className="legal-kicker">회원 정책</p><h1>{title}</h1><p className="legal-date">작성 버전 {MEMBER_POLICY_VERSION} · 시행 전 검토본</p>
      <aside className="legal-draft">현재 정책은 시행 전 검토본입니다. 개인정보 처리업체의 보관기간·국외 이전 내역을 확인한 뒤 시행일을 공지합니다.</aside>
      {children}
      <footer>운영자·개인정보 보호책임자: {POLICY_OPERATOR}<br/>문의: <a href={`mailto:${POLICY_EMAIL}`}>{POLICY_EMAIL}</a></footer>
    </article>
  </main>;
}
