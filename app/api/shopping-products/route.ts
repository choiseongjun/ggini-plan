import {catalogItems} from '../../../lib/catalog-db';
import {shoppingProductsFor} from '../../../lib/shopping-products';

export async function GET(request:Request){
  const names=[...new Set(new URL(request.url).searchParams.getAll('name').map(n=>n.trim()))];
  if(!names.length||names.length>40||names.some(n=>!n||n.length>100))return Response.json({error:'찾을 재료를 확인해 주세요.'},{status:400});
  try{
    const catalog=await catalogItems();
    return Response.json({groups:names.map(name=>({name,products:shoppingProductsFor(name,catalog)}))},{headers:{'Cache-Control':'private, max-age=300'}});
  }catch{
    return Response.json({error:'판매 상품을 불러오지 못했어요.'},{status:503});
  }
}
