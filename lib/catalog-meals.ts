import expansion from '../data/catalog-kr-2000.json';
import type {CatalogItem} from './catalog';
import type {PlanProduct} from './shopping-plan';
import {servingNutrition} from './food-intake';

type Source={id:string;name:string;detail:string;productUrl:string;sourceVolume:string;sourceSalesUnit:string|null;sourceCategories?:string[];unit?:string;quantity?:number};
const sources=new Map<string,Source>(expansion.rows.map(row=>[row.id,row]));
// A retail serving contract, not a calorie or nutrient estimate. Ambiguous packs stay out.
export function retailPortions(source:Source){
 const volume=source.sourceVolume.replaceAll(',','').trim();
 const text=`${source.name} ${volume} ${source.sourceSalesUnit}`;
 if(/종|택|랜덤|옵션|증정/.test(text))return null;
 const weight=volume.match(/^(\d+(?:\.\d+)?)\s*(kg|g)/i);
 if(!weight)return null;
 let grams=Number(weight[1])*(weight[2].toLowerCase()==='kg'?1000:1);
 const counts=[...text.matchAll(/(\d+)\s*(?:인분|인(?=[\s)])|개입|입(?=[\s)]|$))/g)].map(m=>Number(m[1]));
 const multi=volume.match(/^\d+(?:\.\d+)?\s*(?:kg|g)\s*[xX×*]\s*(\d+)/);
 if(multi){counts.push(Number(multi[1]));grams*=Number(multi[1]);}
 if(new Set(counts).size>1)return null;
 const servings=counts[0]??1;
 if(servings<1||servings>12||grams/servings<100||grams/servings>650)return null;
 // Unparsed inner multipacks must not silently become one large meal.
 if(!counts.length&&/[xX×*]\s*\d|\d\s*(?:봉|팩)\s*(?:구성|묶음)/.test(volume))return null;
 return {servings,servingGrams:grams/servings};
}
export function expandedMeals(catalog:CatalogItem[]){
 const mains:PlanProduct[]=[],sides:PlanProduct[]=[];
 for(const p of catalog){
  const s=sources.get(p.id);
  if(!s||p.market!=='KR'||p.currency!=='KRW'||s.name!==p.name||s.detail!==p.detail||s.productUrl!==p.productUrl||s.unit!==p.unit||s.quantity!==p.quantity||!p.priceCheckedAt||p.price<=0)continue;
  if(p.category==='ingredient'||/소스|양념|육수|사리|분말|가루|도우|생지|샌드위치\s*햄|샌드위치용|패티|유아|아이식탁|김밥\s*(?:햄|어묵|단무지|용|세트|준비|키트|에딱)|김밥.*세트|주먹밥.*(?:세트|재료)|비빔밥.*(?:세트|재료)|볶음밥용|칼국수 김치|설렁탕 섞박지|피클|피쉬볼|크래커|쿠키|찌개두부|찌개용|선물세트|\[줄리스\]|\[집반찬연구소\].*비빔밥|\[도리깨침\].*비빔밥|\[진가네반찬\].*비빔밥/.test(p.name))continue;
  if(s.sourceCategories?.some(c=>['면','조미','수입육','한우/육우','돼지고기','과자','소스류'].includes(c)))continue;
  const side=/갈비탕|육개장|미역국|설렁탕|된장국|찌개|제육볶음/.test(p.name)&&!/볶음밥|덮밥|비빔밥|김밥|주먹밥|도시락|정식|피자|샌드위치|라면|컵|초밥/.test(p.name);
  if(!side&&!/볶음밥|덮밥|비빔밥|도시락|김밥|주먹밥|샌드위치|잠봉뵈르|파스타|라자냐|리조또|리소토|우동|쌀국수|칼국수|냉면/.test(p.name))continue;
  const portion=retailPortions(s);if(!portion||side&&portion.servingGrams<200)continue;
  const item:PlanProduct={...p,...portion,category:s.sourceCategories?.includes('밀키트')?'meal_kit':p.category,mealSlots:/샌드위치|잠봉뵈르/.test(p.name)?['breakfast','lunch','dinner']:['lunch','dinner'],servingNote:`판매 구성 ${portion.servings}회로 나눈 기준 · 1회 약 ${Math.round(portion.servingGrams)}g`,avoidanceText:p.allergyInfo&&p.allergyInfo.status!=='unknown'?p.allergyInfo.statement:null};
  (side?sides:mains).push(item);
 }
 return {mains,sides};
}
export function riceCombinations(sides:PlanProduct[],catalog:CatalogItem[]):PlanProduct[]{
 // This rice pack is already used by the reviewed cooking recipes.
 const rice=catalog.find(p=>p.id==='rice'&&p.quantity===210&&p.unit==='g'&&p.detail==='210g × 1개'&&p.productUrl&&p.price>0);
 if(!rice)return [];
 const riceProduct:PlanProduct={...rice,servings:1,servingGrams:210,servingNote:'현미밥 210g 1개',avoidanceText:rice.allergyInfo?.status==='unknown'||!rice.allergyInfo?null:rice.allergyInfo.statement};
 return sides.map(side=>{
  const a=servingNutrition(side),b=servingNutrition(riceProduct);
  return {...side,id:`meal-${side.id}-rice`,name:`${side.name} + 현미밥`,productUrl:null,price:Math.round(side.price/side.servings+rice.price),servings:1,servingGrams:undefined,servingNote:'메인 1회분 + 현미밥 210g',avoidanceText:side.avoidanceText===null||riceProduct.avoidanceText===null?null:`${side.avoidanceText} ${riceProduct.avoidanceText}`,allergens:[...new Set([...(side.allergens??[]),...(rice.allergens??[])])],recipe:{assembly:true,minutes:0,slots:['lunch','dinner'],family:/국|탕|찌개/.test(side.name)?'soup':'meat',steps:['각 상품 포장의 조리법과 가열 시간을 따라 충분히 데워요.','메인 1회분에 현미밥 1개를 곁들여 먹어요. 남은 음식은 포장 보관 안내를 따라 보관해요.'],ingredients:[{product:side,packs:1/side.servings,label:`${side.name} 1회분`},{product:riceProduct,packs:1,label:'현미밥 210g'}],nutrition:{calories:a.calories===null||b.calories===null?null:a.calories+b.calories,protein:a.protein===null||b.protein===null?null:a.protein+b.protein}}} as PlanProduct;
 });
}
