import {canonicalIngredient,isWater} from './ingredient-canonical';

const aliases:Record<string,string[]>={파:['대파','쪽파','실파','파'],달걀:['달걀','계란'],쌀:['쌀','백미','멥쌀'],밥:['즉석밥','백미밥','쌀밥','현미밥'],소고기:['소고기','쇠고기','한우'],돼지고기:['돼지고기','돈육','한돈']};
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function ingredientSearchTerms(names:string[]){
 return [...new Set(names.filter(n=>n.length<=100).flatMap(n=>{
  const key=canonicalIngredient(n);
  return !key||isWater(key)?[]:aliases[key]??[key];
 }))];
}

export function matchesIngredientProduct(name:string,category:string,terms:string[]){
 if(category!=='ingredient')return false;
 const title=name.replace(/\[[^\]]*\]|【[^】]*】/g,' ');
 // Match ingredient words, not a syllable inside another food (파 → 스파게티/파스타).
 // Prepared dishes remain unsuitable even when their title mentions the raw ingredient.
 if(/볶음밥|덮밥|도시락|스파게티|프로틴\s*파스타|만두|피자|샌드위치|밀키트|두부면|두부과자|계란말이/.test(title))return false;
 return terms.some(term=>{
  if(/^(달걀|계란)$/.test(term)&&/두부|구운|훈제|삶은|깐\s*계란|깐\s*달걀|반숙|찜|지단|샐러드/.test(title))return false;
  return new RegExp(`(^|[^가-힣A-Za-z])${escape(term)}(?=$|[^가-힣A-Za-z]|[가-힣]*용(?:$|[^가-힣A-Za-z]))`,'i').test(title);
 });
}
