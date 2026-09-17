import Link from 'next/link';
import CatalogGrid,{twListingMetadata,twListingData,type TwProductSearch} from './catalog-grid';
const title='台灣食品價格・營養成分比較';
const description='比較台灣販售的雞胸肉、冷凍炒飯、水餃、豆漿與日常食材。最多選 4 件商品，並排查看新台幣售價、包裝規格與營養標示來源。';
type Props={searchParams:Promise<TwProductSearch>};
export const revalidate=3600;
export async function generateMetadata({searchParams}:Props){const search=await searchParams;await twListingData(search);return twListingMetadata(title,description,'/tw/products',search);}
export default async function Page({searchParams}:Props){const search=await searchParams;return <><section className="products-intro"><span className="products-kicker">採買前，先比較</span><h1>{title}</h1><p>{description}</p><div className="products-intro-links"><Link href="/tw/foods/chicken_breast">雞胸肉比較 →</Link><Link href="/tw/foods/fried_rice">冷凍炒飯比較 →</Link><Link href="/tw/foods/dumplings">水餃比較 →</Link></div></section><CatalogGrid search={search}/><section className="products-note"><h2>一個人採買，先看整包要付多少錢</h2><p>比較本站已登錄的商品與確認日期，不代表即時最低價或銷售排名。整包金額、實際吃的份量與運費要分開看。</p><Link href="/tw">依自己的預算安排餐點 →</Link></section></>;}
