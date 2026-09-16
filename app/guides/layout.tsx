import Link from "next/link";
import "./style.css";
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <div className="guide-shell"><header><Link href="/" className="guide-brand">끼니플랜.</Link><Link href="/">내 식단 만들기 ↗</Link></header><main>{children}</main><footer><Link href="/guides">자취 식생활 가이드</Link><span>© 끼니플랜</span></footer></div>;
}
