import {excludedFoodAliases,type ExcludedFood} from './excluded-foods';
import type {PlanConditions} from './shopping-plan';

// Editable planning assumptions, NOT collected market prices or seller offers.
// All recipes use dry rice/pasta amounts; prices are charged by assumed retail packs.
const ingredients={
 rice:{name:'쌀',unit:'g',pack:1000,low:3000,high:5000,exclude:['rice']},
 beef:{name:'소고기 (죽·볶음용)',unit:'g',pack:300,low:9000,high:18000,exclude:['beef']},
 mushroom:{name:'버섯',unit:'g',pack:200,low:1500,high:3500,exclude:['mushroom']},
 onion:{name:'양파',unit:'g',pack:600,low:2000,high:4000,exclude:['onion']},
 carrot:{name:'당근',unit:'g',pack:300,low:1000,high:2000,exclude:[]},
 sesameOil:{name:'참기름',unit:'ml',pack:160,low:4000,high:8000,exclude:['sesame']},
 oil:{name:'식용유 (대두유)',unit:'ml',pack:500,low:3000,high:6000,exclude:['soy']},
 salt:{name:'소금',unit:'g',pack:500,low:1000,high:2000,exclude:[]},
 pumpkin:{name:'손질 단호박',unit:'g',pack:500,low:3000,high:6000,exclude:[]},
 riceFlour:{name:'찹쌀가루',unit:'g',pack:300,low:2500,high:5000,exclude:['rice']},
 sugar:{name:'설탕',unit:'g',pack:1000,low:2000,high:3500,exclude:[]},
 egg:{name:'달걀',unit:'개',pack:10,low:3000,high:5000,exclude:['egg']},
 shrimp:{name:'손질 냉동 새우',unit:'g',pack:300,low:6000,high:10000,exclude:['shrimp']},
 chicken:{name:'생 닭가슴살',unit:'g',pack:300,low:3500,high:6500,exclude:['chicken']},
 pasta:{name:'마른 스파게티',unit:'g',pack:500,low:2000,high:4000,exclude:['wheat']},
 tomatoSauce:{name:'토마토 파스타 소스',unit:'g',pack:400,low:2500,high:5000,exclude:['tomato','onion','garlic']},
 milk:{name:'우유',unit:'ml',pack:1000,low:2500,high:4000,exclude:['milk']},
 cheese:{name:'슬라이스 치즈',unit:'g',pack:200,low:3000,high:5000,exclude:['milk']},
} satisfies Record<string,{name:string;unit:string;pack:number;low:number;high:number;exclude:ExcludedFood[]}>;
export type RecipeIngredientKey=keyof typeof ingredients;
type Key=RecipeIngredientKey;
export type EstimateRecipe={id:string;name:string;minutes:string;match:RegExp;parts:[Key,number][];steps:string[]};
export const estimateRecipes:EstimateRecipe[]=[
 {id:'beef-mushroom-porridge',name:'소고기 버섯죽',minutes:'40~50분',match:/소고기.*죽|쇠고기.*죽|한우.*죽/,parts:[['rice',60],['beef',70],['mushroom',50],['onion',30],['sesameOil',3],['salt',1]],steps:['쌀 60g을 씻어 20분 정도 불려요. 소고기와 버섯, 양파를 잘게 썰어요.','냄비에 참기름을 두르고 소고기를 볶다가 쌀과 채소를 넣어요.','물 약 500ml를 넣고 쌀알이 부드러워질 때까지 저으며 끓여요. 물은 농도에 맞춰 더하고 고기는 완전히 익혀요. 소금으로 간해요.']},
 {id:'pumpkin-porridge',name:'단호박죽',minutes:'25~35분',match:/호박.*죽/,parts:[['pumpkin',250],['riceFlour',25],['sugar',5],['salt',0.5]],steps:['손질한 단호박과 물을 냄비에 넣고 부드럽게 익혀요.','호박을 으깨고 물을 더해 원하는 농도로 맞춰요.','찹쌀가루를 찬물에 풀어 조금씩 넣고 저으며 충분히 끓여요. 설탕과 소금으로 간해요.']},
 {id:'chicken-porridge',name:'닭고기 채소죽',minutes:'40~50분',match:/닭.*죽|치킨.*죽/,parts:[['rice',60],['chicken',100],['carrot',30],['onion',30],['salt',1]],steps:['쌀을 씻어 20분 정도 불리고 당근과 양파를 잘게 썰어요.','닭가슴살을 속까지 충분히 삶은 뒤 잘게 찢어요.','쌀과 채소에 물 약 500ml를 넣어 부드럽게 끓인 뒤 닭고기를 넣고 다시 충분히 끓여요. 소금으로 간해요.']},
 {id:'egg-fried-rice',name:'달걀 채소볶음밥',minutes:'15~20분 · 밥 짓는 시간 별도',match:/계란.*볶음밥|달걀.*볶음밥/,parts:[['rice',70],['egg',2],['carrot',30],['onion',30],['oil',5],['salt',1]],steps:['쌀 70g으로 지은 밥 한 공기를 준비하고 채소를 잘게 썰어요.','팬에 식용유를 두르고 달걀을 완전히 익도록 볶아요.','채소를 넣어 익힌 뒤 밥을 넣고 볶아 소금으로 간해요.']},
 {id:'shrimp-fried-rice',name:'새우 달걀볶음밥',minutes:'20분 · 밥 짓는 시간 별도',match:/새우.*볶음밥|쉬림프.*볶음밥/,parts:[['rice',70],['shrimp',80],['egg',1],['carrot',30],['onion',30],['oil',5],['salt',1]],steps:['쌀 70g으로 지은 밥을 준비해요. 새우는 냉장 해동하고 채소를 잘게 썰어요.','팬에 식용유를 두르고 새우와 채소를 충분히 익혀요.','달걀을 넣어 완전히 익힌 뒤 밥을 넣고 볶아 소금으로 간해요.']},
 {id:'tomato-pasta',name:'기본 토마토 파스타',minutes:'20분',match:/토마토.*파스타|토마토.*스파게티/,parts:[['pasta',90],['tomatoSauce',120],['onion',40],['oil',5],['salt',2]],steps:['끓는 물에 소금을 넣고 면을 포장에 적힌 시간만큼 삶아요.','팬에 식용유를 두르고 잘게 썬 양파를 익힌 뒤 토마토 소스를 넣어요.','삶은 면을 소스와 섞고 면수를 조금 더해 농도를 맞춰요.']},
 {id:'mushroom-cream-pasta',name:'버섯 우유 크림파스타',minutes:'20~25분',match:/버섯.*파스타|머쉬룸.*파스타|크림.*파스타/,parts:[['pasta',90],['mushroom',80],['milk',150],['cheese',20],['onion',40],['oil',5],['salt',2]],steps:['면을 포장 안내에 맞춰 삶고 버섯과 양파를 썰어요.','팬에 식용유를 두르고 버섯과 양파를 익힌 뒤 우유와 치즈를 넣어요.','약한 불에서 소스를 저어가며 데우고 면을 섞어요. 소금으로 간하고 면수로 농도를 맞춰요.']},
];
export function allowedEstimateRecipes(c:PlanConditions){
 const words=c.avoid.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean);
 return estimateRecipes.filter(r=>{
  const text=[r.name,...r.parts.map(([id])=>ingredients[id].name)].join(' ');
  return !(c.excluded??[]).some(key=>r.parts.some(([id])=>(ingredients[id].exclude as readonly string[]).includes(key))||excludedFoodAliases[key].some(word=>text.includes(word)))&&!words.some(word=>text.includes(word));
 });
}
export function recipeEstimate(recipe:EstimateRecipe,owned:string[]=[]){
 const rows=recipe.parts.map(([id,amount])=>{const item=ingredients[id];return {id,...item,amount,usedLow:item.low*amount/item.pack,usedHigh:item.high*amount/item.pack,buyLow:owned.includes(id)?0:Math.ceil(amount/item.pack)*item.low,buyHigh:owned.includes(id)?0:Math.ceil(amount/item.pack)*item.high};});
 const total=(key:'usedLow'|'usedHigh'|'buyLow'|'buyHigh')=>rows.reduce((sum,r)=>sum+r[key],0);
 // Round range outward so displayed bounds never promise more precision than the assumptions.
 return {rows,usedLow:Math.floor(total('usedLow')/100)*100,usedHigh:Math.ceil(total('usedHigh')/100)*100,buyLow:total('buyLow'),buyHigh:total('buyHigh')};
}
