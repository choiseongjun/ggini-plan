import {notFound} from 'next/navigation';
import {catalogItems} from '../../lib/catalog-db';
import convenience from '../../data/convenience-preview.json';
import {planProducts} from '../../lib/shopping-plan-catalog';
import {recipeEffort} from '../../lib/cooking-effort';
import {PrepPreview,type PreviewMeal} from './preview';

export const dynamic='force-dynamic';
export const metadata={title:'한 끼 준비 방식 · 로컬 시안',robots:{index:false,follow:false}};
export default async function Page(){
 if(process.env.NODE_ENV!=='development')notFound();
 const [catalog,recipes]=await Promise.all([catalogItems(),planProducts()]);
 const retail:PreviewMeal[]=convenience.map(p=>({id:p.id,brand:p.brand,name:p.name.replace(/^(?:도|샌|햄|삼|빅삼|김|주|면|핫|샐|그린|삼립|롯데)\)/,''),image:p.image,url:p.url,price:p.price,note:'priceNote' in p?p.priceNote!:'공식 상품 목록 가격 · 1개 기준',steps:[],ingredients:[],checkedAt:p.checkedAt}));
 const simple=recipes.filter(p=>p.recipe&&!p.recipe.assembly&&!(p.recipe.sideCount)&&recipeEffort(p)==='easy'&&/볶음밥|토스트|오믈렛|스크램블|달걀국|계란국|두부구이/.test(p.name));
 const cooked=recipes.filter(p=>p.recipe&&!p.recipe.assembly&&!(p.recipe.sideCount));
 const convert=(p:(typeof recipes)[number],retail=false):PreviewMeal=>({id:p.id,name:p.name.replaceAll('_',' · '),image:p.productImageUrl,url:retail?p.productUrl:null,price:Math.round(p.price/p.servings),note:retail?'판매 단위 가격을 1회분으로 나눈 참고값':'사용 재료비 기준 · 구매 금액은 달라요',steps:p.recipe?.steps??[],ingredients:p.recipe?.ingredients.map(i=>i.label)??[],checkedAt:retail?p.priceCheckedAt??null:null});
 return <PrepPreview groups={{ready:retail,simple:simple.slice(0,18).map(p=>convert(p)),cook:cooked.slice(0,18).map(p=>convert(p))}} counts={{catalog:catalog.length,ready:retail.length,simple:simple.length,cook:cooked.length}}/>;
}
