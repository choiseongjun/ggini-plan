import {nutritionAmount} from './detailed-nutrition';

export const foodSourceUrl='https://various.foodsafetykorea.go.kr/nutrient/general/site/Info.do';
// Reference links only: their presence does not certify a menu match or freshness.
export function officialNutritionUrl(brand:string|null){return brand==='도미노피자'?'https://web.dominos.co.kr/contents/ingredient':brand==='빽다방'?'https://paikdabang.com/menu/':null;}
type ReferenceRow={basis_amount:string|number;basis_unit:string;calories_kcal:string|null;protein_g:string|null;fat_g:string|null;carbohydrates_g:string|null;sugar_g:string|null;sodium_mg:string|null};
const fields={calories_kcal:'에너지(kcal)',protein_g:'단백질(g)',fat_g:'지방(g)',carbohydrates_g:'탄수화물(g)',sugar_g:'당류(g)',sodium_mg:'나트륨(mg)'} as const;
const text=(v:unknown)=>typeof v==='string'&&v.trim()&&!['-','해당없음'].includes(v.trim())?v.trim():null;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))?v:null;
export function foodProvenance(row:ReferenceRow,raw:Record<string,unknown>|null){
 if(!raw)return null;
 const basis=nutritionAmount(String(raw['영양성분함량기준량']??raw['영양성분제공단위량']??''));
 const matches=!!basis&&basis.value===Number(row.basis_amount)&&basis.unit===row.basis_unit&&Object.entries(fields).every(([column,key])=>{
  const a=row[column as keyof typeof fields],b=text(raw[key]);
  return a===null?b===null:b!==null&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<0.00001;
 });
 return {matches,source:text(raw['출처명'])??'식품영양성분 데이터베이스',sourceDate:date(raw['데이터기준일자']),createdDate:date(raw['데이터생성일자']),basisText:text(raw['영양성분함량기준량']??raw['영양성분제공단위량']),weightText:text(raw['식품중량']),servingText:text(raw['1인(회)분량 참고량']??raw['1회 섭취참고량']??raw['1회섭취참고량']),origin:text(raw['식품기원명'])};
}
