import {notFound} from 'next/navigation';
import {twCategories,type TwCategory} from '../../../../lib/taiwan-catalog';
import CatalogGrid,{twListingMetadata,twListingData,type TwProductSearch} from '../../products/catalog-grid';
import CatalogLayout from '../../products/layout';
type Props={params:Promise<{category:string}>;searchParams:Promise<TwProductSearch>};
async function selected(props:Props){const {category}=await props.params;if(!Object.hasOwn(twCategories,category))notFound();const key=category as TwCategory;const search=await props.searchParams;await twListingData(search,key);return {key,search,info:twCategories[key]};}
export const revalidate=3600;
export async function generateMetadata(props:Props){const {key,search,info}=await selected(props);return twListingMetadata(info.label+'價格與營養比較',info.description,'/tw/categories/'+key,search);}
export default async function Page(props:Props){const {key,search,info}=await selected(props);return <CatalogLayout><h1>{info.label}價格與營養比較</h1><p>{info.description}</p><CatalogGrid category={key} search={search}/></CatalogLayout>;}
