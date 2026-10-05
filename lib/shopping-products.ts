import type {CatalogItem} from './catalog';
import {ingredientSearchTerms,matchesIngredientProduct} from './recipe-ingredient-products';

export type ShoppingProduct = Pick<CatalogItem,'id'|'name'|'detail'|'price'|'quantity'|'unit'|'priceCheckedAt'|'priceNote'> & {
  productUrl:string; productImageUrl:string|null; seller:string;
};
export type ShoppingProductGroup = {name:string;products:ShoppingProduct[]};

function httpsUrl(value:string|null){
  try {const url=new URL(value??'');return url.protocol==='https:'?url:null;}catch{return null;}
}

// A raw ingredient must not match a prepared dish just because its name contains it.
// Ready-to-eat ingredients such as 장어구이 can match the same named retail dish.
export function shoppingProductsFor(name:string,catalog:CatalogItem[]):ShoppingProduct[]{
  const terms=ingredientSearchTerms([name]);
  if(!terms.length)return [];
  const exactName=name.replace(/\s+/g,'');
  const matches=catalog.filter(p=>{
    if(!Number.isFinite(p.price)||p.price<=0||!httpsUrl(p.productUrl))return false;
    const title=p.name.replace(/\[[^\]]*\]|【[^】]*】/g,' ').replace(/\s+/g,'');
    const preparedWords=['장조림','핫도그','샐러드','냉채','큐브','수비드','소시지','너겟','스테이크','닭강정','미트볼','완자','피클','절임','튀김','조림','훈제','양념','주스','분말','가루','소스','구이','볶음','과자','스낵'];
    if(preparedWords.some(word=>title.includes(word)&&!exactName.includes(word)))return false;
    if(exactName==='닭가슴살'&&/캔|통조림/.test(p.detail))return false;
    if(terms.some(t=>/^(달걀|계란)$/.test(t))&&/쫄깃|구운|반숙|훈제|삶은/.test(p.name))return false;
    if(matchesIngredientProduct(p.name,p.category,terms))return true;
    if(exactName==='밥'&&matchesIngredientProduct(p.name,'ingredient',terms))return true;
    if(!/구이|조림|볶음|즉석밥/.test(exactName))return false;
    return title.includes(exactName)&&!/소스|맛스낵|덮밥|도시락|키트/.test(title);
  });
  // Freshly checked records first; the smallest package price is not necessarily the best value.
  const checkedDay=(p:CatalogItem)=>Math.floor((Date.parse(p.priceCheckedAt??'')||0)/86_400_000);
  matches.sort((a,b)=>checkedDay(b)-checkedDay(a)||a.price-b.price||a.id.localeCompare(b.id));
  const seen=new Set<string>();
  return matches.flatMap(p=>{
    const url=httpsUrl(p.productUrl)!;
    if(seen.has(url.href))return [];
    seen.add(url.href);
    const host=url.hostname.replace(/^www\./,'');
    const seller=/(^|\.)kurly.com$/.test(host)?'컬리':/(^|\.)oasis.co.kr$/.test(host)?'오아시스':/(^|\.)coupang.com$/.test(host)?'쿠팡':host;
    return [{id:p.id,name:p.name,detail:p.detail,price:p.price,quantity:p.quantity,unit:p.unit,priceCheckedAt:p.priceCheckedAt,priceNote:p.priceNote,productUrl:url.href,productImageUrl:httpsUrl(p.productImageUrl)?.href??null,seller}];
  }).slice(0,3);
}
