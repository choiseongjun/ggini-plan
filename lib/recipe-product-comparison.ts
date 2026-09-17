import type {CatalogItem} from './catalog';
import {excludedFoodAliases} from './excluded-foods';
import {recipeEstimate,type EstimateRecipe,type RecipeIngredientKey} from './recipe-estimates';
import type {PlanConditions} from './shopping-plan';

// Explicit pack contracts prevent prepared rice/raw rice and cooked/raw chicken substitutions.
// A changed selling configuration falls back to an estimate until reviewed again.
const links:{key:RecipeIngredientKey;id:string;name:string;detail:string;unit:'g'|'개';quantity:number;amount:number}[]=[
 {key:'beef',id:'kurly-5103616',name:'[KF365] 1+ 한우 불고기용 300g(냉장)',detail:'300g · 1팩 · 냉장',unit:'개',quantity:1,amount:300},
 {key:'egg',id:'eggs',name:'[KF365] 무항생제 달걀 L(대란)',detail:'20구 · 1팩',unit:'개',quantity:20,amount:20},
 {key:'pasta',id:'kurly-1001574263',name:'[그라노로] 2분 파스타 500g',detail:'500g · 1개 · 상온',unit:'개',quantity:1,amount:500},
 {key:'tomatoSauce',id:'kurly-1001994989',name:'[폰타나] 저당 토마토 파스타 소스 600g',detail:'600g · 상온',unit:'개',quantity:1,amount:600},
];
function permitted(p:CatalogItem,c:PlanConditions){
 const excluded=c.excluded??[],words=c.avoid.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean);
 if((excluded.length||words.length)&&(!p.allergyInfo||p.allergyInfo.status==='unknown'))return false;
 const text=`${p.name} ${p.allergyInfo?.statement??''} ${(p.allergens??[]).join(' ')}`;
 return !excluded.some(key=>excludedFoodAliases[key].some(word=>text.includes(word)))&&!words.some(word=>text.includes(word));
}
export function compareRecipeProducts(recipe:EstimateRecipe,catalog:CatalogItem[],conditions:PlanConditions,owned:string[]=[],servings=1){
 const count=Math.max(1,Math.min(7,Math.floor(servings)||1));
 const rows=recipeEstimate(recipe).rows.map(row=>{
  const contract=links.find(l=>l.key===row.id);
  const product=contract?catalog.find(p=>p.id===contract.id&&p.name===contract.name&&p.detail===contract.detail&&p.unit===contract.unit&&p.quantity===contract.quantity&&p.category==='ingredient'&&p.productUrl&&Number.isFinite(p.price)&&p.price>0&&(!p.currency||p.currency==='KRW')&&(!p.market||p.market==='KR')&&permitted(p,conditions)):undefined;
  const pack=product?contract!.amount:row.pack,low=product?product.price:row.low,high=product?product.price:row.high;
  const required=row.amount*count;
  const enough=owned.includes(row.id)||(product&&conditions.owned.includes(product.id));
  const stock=product?Math.max(0,conditions.supply?.[product.id]??0)*pack:0;
  const have=enough?Math.max(required,stock):stock;
  const packs=Math.max(0,Math.ceil(Math.max(0,required-have)/pack-1e-9));
  return {...row,product,pack,low,high,amount:required,packs,have,usedLow:low*required/pack,usedHigh:high*required/pack,buyLow:packs*low,buyHigh:packs*high,left:Math.max(0,have+packs*pack-required)};
 });
 const sum=(key:'usedLow'|'usedHigh'|'buyLow'|'buyHigh')=>Math.round(rows.reduce((s,r)=>s+r[key],0));
 return {rows,count,linked:rows.filter(r=>r.product).length,usedLow:sum('usedLow'),usedHigh:sum('usedHigh'),buyLow:sum('buyLow'),buyHigh:sum('buyHigh')};
}
