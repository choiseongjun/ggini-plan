import Link from 'next/link';
import '../taiwan.css';
import './catalog.css';
import '../../products/products.css';
export default function Layout({children}:{children:React.ReactNode}){return <main className="tw-app tw-catalog products-shell" lang="zh-TW"><header className="tw-header"><Link href="/tw" className="tw-brand">🍚 Kkini Plan 台灣</Link><Link href="/tw">安排餐點 →</Link></header>{children}<footer className="tw-footer"><p>售價為確認當日的參考資料，未含運費。實際價格、庫存、配送與規格請以賣場為準。</p><Link href="/tw/products">台灣食品價格・營養比較</Link> · <Link href="/tw">用預算安排每一餐</Link></footer></main>;}
