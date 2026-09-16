import Link from "next/link";
import type { Metadata } from "next";
import SubmissionPanel from "./panel";
import "./style.css";
export const metadata: Metadata = { title: "메뉴·상품 제보 | 끼니플랜", robots: { index: false, follow: false }, alternates: { canonical: null } };
export default function SubmissionsPage() { return <main className="submission-shell"><header><Link href="/">← 끼니플랜으로</Link><span>함께 채우는 식탁</span></header><h1>메뉴·상품 제보</h1><SubmissionPanel/></main>; }
