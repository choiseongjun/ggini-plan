import Link from 'next/link';
import type {ReactNode} from 'react';
import './products.css';
export default function ProductLayout({children}:{children:ReactNode}){
 return <main className="products-shell" lang="ko"><header className="products-header"><Link href="/" className="products-brand">끼니플랜<span>.</span></Link><nav aria-label="상품 비교 메뉴"><Link href="/products">상품 비교</Link><Link href="/guides">식비 가이드</Link></nav></header>{children}<footer className="products-footer"><strong>확인한 정보로 비교해요.</strong><p>등록된 판매 옵션과 확인일 기준 가격입니다. 배송비·쿠폰·재고는 판매처에서 확인하세요. 영양정보 미확인은 0을 뜻하지 않습니다.</p><Link href="/submissions#submit">상품·영양정보 보완 제보 →</Link><Link href="/">내 예산으로 식단 추천받기 →</Link></footer></main>;
}
