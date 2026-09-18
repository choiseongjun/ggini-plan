import type {CatalogItem} from './catalog';

export const ingredientRoles={rice:'조리된 밥',tofu:'단단한 두부',eggs:'생달걀',chicken:'익힌 닭가슴살',vegetables:'볶음용 채소',beef:'양념 소불고기',pork:'양념 돼지불고기',belly:'구이용 삼겹살',onion:'양파',mushroom:'표고버섯',cabbage:'양배추',rawPork:'볶음용 생돼지고기',rawBeef:'불고기용 생소고기',rawChicken:'생닭가슴살',fish:'구이용 순살 생선',potato:'감자',zucchini:'애호박'} as const;
export type IngredientRole=keyof typeof ingredientRoles;
export function ingredientRole(p:CatalogItem):IngredientRole|null{
 const n=p.name.replace(/\[[^\]]*\]/g,'');
 if(/소스|드레싱|분말|가루|전골|도시락|볶음밥|김밥|샌드위치|만두|피자|국밥|떡|과자|즙|피클|장아찌|샐러드/.test(n)&&!/볶음밥용 채소/.test(n))return null;
 if(/(?:현미|쌀|잡곡|백미)밥|즉석밥|현미로 지은밥/.test(n)&&!/곤약|죽/.test(n))return 'rice';
 if(/두부/.test(n)&&!/순두부|연두부|유부|푸딩|면|건두부|포두부|동두부|양념|조림|튀김|마파|강정|너겟|스테이크|볼|과자/.test(n))return 'tofu';
 if(/달걀|계란/.test(n)&&!/구운|훈제|삶은|깐 |지단|찜|말이|반숙|액란|흰자/.test(n))return 'eggs';
 if(/닭가슴살/.test(n)&&/오리지널|스팀|수비드|훈제/.test(n)&&!/생 |생닭|소스|볼|스테이크|큐브/.test(n))return 'chicken';
 if(/볶음밥용 채소|볶음용 채소/.test(n))return 'vegetables';
 if(/불고기/.test(n)&&/양념|간장|숙성|배 소불고기/.test(n)&&!/불고기용|고추장|매콤|매운/.test(n))return /소불고기|소 불고기|한우/.test(n)?'beef':/돼지|돈불고기|한돈/.test(n)?'pork':null;
 if(/삼겹살/.test(n)&&!/찌개용|양념|훈제|수육|통삼겹|바베큐|볶음|찜/.test(n)&&/구이|급냉|대패/.test(n))return 'belly';
 if(!/양념|훈제|소스|가공|스테이크|큐브|튀김|구운|조림/.test(n)){
  if(/돼지|한돈|돈육/.test(n)&&/불고기용|제육용|앞다리 불고기/.test(n))return 'rawPork';
  if(/소고기|한우|쇠고기/.test(n)&&/불고기용|앞다리 불고기/.test(n))return 'rawBeef';
  if(/닭가슴살/.test(n)&&/생닭|생 |무항생제|1등급/.test(n))return 'rawChicken';
  if(/고등어|삼치|연어/.test(n)&&/순살|필렛|구이용/.test(n)&&!/회|염장|간고등어/.test(n))return 'fish';
 }
 if(/감자/.test(n)&&!/고구마|튀김|채소|믹스|샐러드|치즈|감자전|볶음|조림|옹심|수제비|뇨끼|웨지|해시|허니|버터/.test(n))return 'potato';
 if(/애호박/.test(n)&&!/말린|건조|채소|믹스/.test(n))return 'zucchini';
 if(/양파/.test(n)&&!/튀김|링|채소|믹스/.test(n))return 'onion';
 if(/표고버섯/.test(n)&&!/건조|건표고|말린/.test(n))return 'mushroom';
 if(/양배추/.test(n)&&!/적양배추|믹스|채소/.test(n))return 'cabbage';
 return null;
}
export function ingredientPack(p:CatalogItem,role:IngredientRole):number|null{
 const detail=p.detail.replaceAll(',','').trim();
 if(/내외|약 |랜덤|옵션|택|증정|~/.test(detail))return null;
 if(role==='eggs'){
  const match=detail.match(/^(\d+)\s*(?:구|개)(?:\s|·|$)/);
  return match&&Number(match[1])>0?Number(match[1]):null;
 }
 const volume=detail.split('·')[0].trim();
 const m=volume.match(/^(\d+(?:\.\d+)?)\s*(kg|g)(?:\s*[xX×*]\s*(\d+)\s*(?:개입|입|개|팩|봉)?)?$/i);
 if(!m)return null;
 const grams=Number(m[1])*(m[2].toLowerCase()==='kg'?1000:1)*Number(m[3]??1);
 return grams>0&&grams<=20000?grams:null;
}
export function cookingIngredientPool(catalog:CatalogItem[]){
 const groups=Object.fromEntries(Object.keys(ingredientRoles).map(key=>[key,[]])) as unknown as Record<IngredientRole,{product:CatalogItem;amount:number}[]>;
 for(const product of catalog){
  if(product.market!=='KR'||product.currency!=='KRW'||!product.productUrl||!(product.price>0)||!product.priceCheckedAt||!Number.isFinite(Date.parse(product.priceCheckedAt)))continue;
  const role=ingredientRole(product);if(!role)continue;
  const amount=ingredientPack(product,role);if(amount===null)continue;
  groups[role].push({product,amount});
 }
 for(const group of Object.values(groups))group.sort((a,b)=>a.product.price/a.amount-b.product.price/b.amount||a.product.id.localeCompare(b.product.id));
 return groups;
}
