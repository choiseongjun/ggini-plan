import {notFound} from 'next/navigation';
import {twCategories,twMetadata,type TwCategory} from '../../../../lib/taiwan-catalog';
import CatalogGrid from '../../products/catalog-grid';
import CatalogLayout from '../../products/layout';
type Props={params:Promise<{category:string}>;searchParams:Promise<{page?:string}>};
function selected(key:string){if(!Object.hasOwn(twCategories,key))notFound();return twCategories[key as TwCategory];}
export const revalidate=3600;
export async function generateMetadata({params,searchParams}:Props){const {category}=await params;const {page}=await searchParams;const info=selected(category);return twMetadata(info.label+'價格與選購',info.description,`/tw/categories/${category}`+(page&&page!=='1'?`?page=${Number(page)}`:''));}
export default async function Page({params,searchParams}:Props){const {category}=await params;const {page}=await searchParams;const info=selected(category);return <CatalogLayout><h1>{info.label}價格與選購</h1><p>{info.description}</p><CatalogGrid category={category as TwCategory} page={page?Number(page):1}/></CatalogLayout>;}
