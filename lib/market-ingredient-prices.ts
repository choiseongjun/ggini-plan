import {canonicalIngredient} from './ingredient-canonical';
import type {PlanProduct} from './shopping-plan';
import type {RegionalPrice} from './regional-price-recommendations';

// Recipe ingredients priced from KAMIS retail rows instead of the stored per-recipe estimate.
// Keys are canonicalIngredient() names. Only weight units, plus two reviewed conversions:
// 특란 1구 ≈ 60g, and cooked rice ≈ 2.3× the weight of raw rice.
type Series={name:string;variety?:string;grade?:string;gramsPerCount?:number;cooked?:number};
const SERIES:Record<string,Series>={
 양파:{name:'양파'},파:{name:'파',variety:'대파'},감자:{name:'감자',variety:'수미(노지)'},마늘:{name:'깐마늘(국산)'},
 당근:{name:'당근'},시금치:{name:'시금치'},새송이버섯:{name:'새송이버섯'},느타리버섯:{name:'느타리버섯',variety:'느타리버섯'},
 팽이버섯:{name:'팽이버섯'},청양고추:{name:'풋고추',variety:'청양고추'},토마토:{name:'토마토'},방울토마토:{name:'방울토마토',variety:'방울토마토'},
 생강:{name:'생강'},부추:{name:'부추'},깻잎:{name:'깻잎'},고구마:{name:'고구마',variety:'밤'},
 돼지고기:{name:'돼지',variety:'앞다리'},돼지고기앞다리살:{name:'돼지',variety:'앞다리'},돼지고기다짐육:{name:'돼지',variety:'앞다리'},삼겹살:{name:'돼지',variety:'삼겹살'},
 달걀:{name:'계란',variety:'특란10구',grade:'일반란',gramsPerCount:60},
 쌀:{name:'쌀',variety:'20kg'},밥:{name:'쌀',variety:'20kg',cooked:2.3},흰쌀밥:{name:'쌀',variety:'20kg',cooked:2.3},
};
// A market price this far from the stored estimate usually means a unit mix-up, not a real price.
const MAX_RATIO=4;

export type MarketPrice={region:string;date:string;computed:boolean;series:string};

function grams(unit:string,series:Series){
 const weight=unit.match(/^(\d+(?:\.\d+)?)(kg|g)$/);
 if(weight)return Number(weight[1])*(weight[2]==='kg'?1000:1);
 const count=unit.match(/^(\d+)구$/);
 return count&&series.gramsPerCount?Number(count[1])*series.gramsPerCount:null;
}

export function marketPricePerGram(name:string,rows:RegionalPrice[]){
 const series=SERIES[canonicalIngredient(name)];
 if(!series)return null;
 const candidates=rows.filter(r=>r.name===series.name&&(!series.variety||r.variety===series.variety)&&(!series.grade||r.grade===series.grade)&&Number.isFinite(r.price)&&r.price>0);
 // 상품 grade first where the series has grades; livestock rows carry the cut name instead.
 candidates.sort((a,b)=>Number(b.grade==='상품')-Number(a.grade==='상품')||a.variety.localeCompare(b.variety)||a.unit.localeCompare(b.unit));
 const row=candidates.find(r=>grams(r.unit,series));
 if(!row)return null;
 return {perGram:row.price/grams(row.unit,series)!/(series.cooked??1),price:{region:row.region,date:row.date,computed:row.source==='kamis-computed',series:`${row.name} ${row.variety} ${row.unit}`.trim()}};
}

// Reprices the shared ingredient products (whole-pack price = per-gram price × pack grams) and
// moves each recipe's price by the change in its ingredient cost, so totals stay consistent.
export function applyMarketPrices(products:PlanProduct[],rows:RegionalPrice[]):PlanProduct[]{
 if(!rows.length)return products;
 const repriced=new Map<string,PlanProduct|null>();
 const reprice=(p:PlanProduct)=>{
  if(repriced.has(p.id))return repriced.get(p.id)??p;
  let next:PlanProduct|null=null;
  const market=p.unit==='g'&&p.quantity>0&&p.price>0?marketPricePerGram(p.name,rows):null;
  if(market){
   const price=Math.round(market.perGram*p.quantity),ratio=price/p.price;
   if(price>0&&ratio<=MAX_RATIO&&ratio>=1/MAX_RATIO)next={...p,price,marketPrice:market.price};
  }
  repriced.set(p.id,next);
  return next??p;
 };
 return products.map(p=>{
  if(!p.recipe||p.recipe.assembly)return p;
  let delta=0;
  const ingredients=p.recipe.ingredients.map(part=>{
   const product=reprice(part.product);
   if(product===part.product)return part;
   delta+=(product.price-part.product.price)*part.packs;
   return {...part,product};
  });
  if(ingredients.every((part,i)=>part===p.recipe!.ingredients[i]))return p;
  return {...p,price:Math.max(0,Math.round(p.price+delta)),recipe:{...p.recipe,ingredients}};
 });
}
