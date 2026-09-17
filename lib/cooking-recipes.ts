import type {CatalogItem} from './catalog';
import type {PlanProduct,MealSlot} from './shopping-plan';

// Quantities are recipe portions, not extra catalog products or live price quotes.
// Only these known selling configurations can be used; changed packs fail closed.
const contracts = {
 rice:{unit:'g',quantity:210,match:/210g.*1개/,grams:210},
 tofu:{unit:'g',quantity:300,match:/300g.*1팩/,grams:300},
 eggs:{unit:'개',quantity:20,match:/20구/,grams:1000},
 chicken:{unit:'g',quantity:100,match:/100g/,grams:100},
 'kurly-5036690':{unit:'개',quantity:1,match:/600g/,grams:600},
} as const;
type IngredientId=keyof typeof contracts;
type Recipe={id:string;name:string;emoji:string;family:string;minutes:number;slots:MealSlot[];parts:[IngredientId,number,string][];steps:string[]};
const recipes:Recipe[]=[
 {id:'cook-egg-rice',name:'달걀 채소 덮밥',emoji:'🍳',family:'rice',minutes:15,slots:['lunch','dinner'],parts:[['rice',1,'현미밥 210g'],['eggs',0.1,'달걀 2개'],['kurly-5036690',0.2,'채소 120g']],steps:['채소와 물을 팬에 넣고 익혀요.','달걀 2개를 풀어 넣고 완전히 익힌 뒤 데운 밥에 올려요.']},
 {id:'cook-tofu-rice',name:'두부 채소 현미볼',emoji:'🥦',family:'rice',minutes:15,slots:['lunch','dinner'],parts:[['rice',1,'현미밥 210g'],['tofu',0.5,'두부 150g'],['kurly-5036690',0.2,'채소 120g']],steps:['두부와 채소에 물을 조금 넣고 뚜껑을 덮어 충분히 익혀요.','데운 현미밥 위에 두부와 채소를 올려요.']},
 {id:'cook-chicken-porridge',name:'닭고기 채소죽',emoji:'🥣',family:'porridge',minutes:20,slots:['lunch','dinner'],parts:[['rice',1,'현미밥 210g'],['chicken',1,'오리지널 닭가슴살 100g'],['kurly-5036690',0.2,'채소 120g']],steps:['밥과 채소에 물을 넣고 부드러워질 때까지 끓여요.','잘게 찢은 닭가슴살을 넣고 제품 조리 안내에 따라 충분히 가열해요.']},
 {id:'cook-tofu-egg',name:'두부 달걀찜과 작은 밥',emoji:'🍚',family:'rice',minutes:15,slots:['breakfast','lunch','dinner'],parts:[['rice',0.5,'현미밥 105g'],['tofu',0.5,'두부 150g'],['eggs',0.1,'달걀 2개']],steps:['으깬 두부와 달걀, 물을 섞어 찜기에 넣어요.','속까지 완전히 익힌 뒤 데운 밥 반 개를 곁들여요. 남은 밥은 바로 식혀 냉장 보관하세요.']},
];
function nutrients(p:CatalogItem,packs:number,grams:number){
 if(!p.nutritionSourceUrl&&!p.nutritionPhotoUrl)return {calories:null,protein:null};
 // These reviewed formats express either grams per label or total package.
 const basis=p.nutritionBasis??'';
 const match=basis.match(/(\d+(?:\.\d+)?)g/);
 const factor=match&&Number(match[1])>0?grams*packs/Number(match[1]):null;
 return {calories:factor!==null&&p.caloriesKcal!==null?p.caloriesKcal*factor:null,protein:factor!==null&&p.proteinG!==null?p.proteinG*factor:null};
}
export function cookingProducts(catalog:CatalogItem[]):PlanProduct[]{
 return recipes.flatMap(r=>{
  const parts=r.parts.map(([id,packs,label])=>{
   const p=catalog.find(p=>p.id===id),contract=contracts[id];
   if(!p||p.unit!==contract.unit||p.quantity!==contract.quantity||!contract.match.test(p.detail)||!p.productUrl||p.price<=0)return null;
   const product:PlanProduct={...p,servings:1,servingGrams:contract.grams,servingNote:'판매 1묶음',avoidanceText:p.allergyInfo?.status==='unknown'||!p.allergyInfo?null:`${p.name} ${p.allergyInfo.statement}`};
   return {product,packs,label,nutrition:nutrients(p,packs,contract.grams)};
  });
  if(parts.some(p=>p===null))return [];
  const ingredients=parts.filter(p=>p!==null);
  const sum=(key:'calories'|'protein')=>ingredients.some(i=>i.nutrition[key]===null)?null:Math.round(ingredients.reduce((s,i)=>s+i.nutrition[key]!,0)*10)/10;
  const base=ingredients[0].product;
  return [{...base,id:r.id,name:r.name,emoji:r.emoji,category:'other' as const,productUrl:null,productImageUrl:null,
   detail:'재료를 직접 준비하는 1인분 · 양념 추가 시 비용·영양 별도',price:Math.round(ingredients.reduce((sum,p)=>sum+p.product.price*p.packs,0)),quantity:1,unit:'개' as const,servings:1,servingGrams:undefined,
   servingNote:'레시피 1인분 · 재료별 등록 영양 합산 예상',avoidanceText:ingredients.some(i=>i.product.avoidanceText===null)?null:ingredients.map(p=>`${p.label} ${p.product.avoidanceText} ${(p.product.allergens??[]).join(' ')}`).join(' '),
   allergens:[...new Set(ingredients.flatMap(p=>p.product.allergens??[]))],allergyInfo:null,nutritionSourceName:null,nutritionSourceUrl:null,nutritionPhotoUrl:null,nutritionBasis:null,caloriesKcal:null,proteinG:null,carbohydratesG:null,fatG:null,sodiumMg:null,protein:'재료 합산 예상',
   recipe:{minutes:r.minutes,slots:r.slots,family:r.family,steps:r.steps,ingredients:ingredients.map(({product,packs,label})=>({product,packs,label})),nutrition:{calories:sum('calories'),protein:sum('protein')}}}];
 });
}
export function comparisonFamily(p:PlanProduct){return p.recipe?.family??(/죽/.test(p.name)?'porridge':/밥|도시락/.test(p.name)?'rice':null);}
export function matchesCookingAlternative(a:PlanProduct,b:PlanProduct){
 const recipe=a.recipe?a:b,ready=a.recipe?b:a;
 if(!recipe.recipe||ready.recipe||comparisonFamily(recipe)!==comparisonFamily(ready))return false;
 const groups=[/소고기|쇠고기|한우|비프/,/돼지|삼겹|베이컨|햄|잠봉|제육/,/새우|게살|전복|연어|참치|명란|오징어/,/호박/,/닭|치킨/,/달걀|계란|에그/,/두부/];
 const mentioned=groups.filter(pattern=>pattern.test(ready.name));
 // Sharing a meal type alone is not enough: beef porridge must not become chicken porridge.
 return mentioned.length>0&&mentioned.every(pattern=>pattern.test(recipe.name));
}
