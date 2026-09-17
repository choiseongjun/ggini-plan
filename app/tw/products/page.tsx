import {twMetadata} from '../../../lib/taiwan-catalog';
import CatalogGrid from './catalog-grid';
export async function generateMetadata({searchParams}:{searchParams:Promise<{page?:string}>}){const {page}=await searchParams;return twMetadata('台灣食材與冷凍食品價格目錄','查看台灣販售的食材、冷凍食品與即食餐點，比較包裝價格、確認營養來源，再安排自己的餐費與購物清單。','/tw/products'+(page&&page!=='1'?`?page=${Number(page)}`:''));}
export const revalidate=3600;
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const {page}=await searchParams;return <><h1>台灣食材與冷凍食品</h1><p>先看一包多少錢，再決定這週怎麼吃。餐數未確認的商品會保留原販售價格，不換算成每餐成本。</p><CatalogGrid page={page?Number(page):1}/></>;}
