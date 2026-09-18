import {calorieEstimate,parseBodyProfile} from './body-profile';

// 2025 KDRIs summary, pp. xi–xiii and xix (MOHW).
export const nutritionReferenceSource='https://health.seoulmc.or.kr/uploadFiles/2025_%ED%95%9C%EA%B5%AD%EC%9D%B8%EC%98%81%EC%96%91%EC%86%8C%EC%84%AD%EC%B7%A8%EA%B8%B0%EC%A4%80_%ED%99%9C%EC%9A%A9.pdf';
export function dailyNutritionReference(raw:unknown){
 const p=parseBodyProfile(raw);
 if(!p||p.pregnancy)return null;
 const energy=calorieEstimate(p);
 if(!energy)return null;
 const band=p.age<30?0:p.age<50?1:p.age<65?2:p.age<75?3:4;
 return {
  label:`만 ${p.age}세 · ${p.sex==='male'?'남성':'여성'} · ${['19–29세','30–49세','50–64세','65–74세','75세 이상'][band]} 기준`,
  calories:energy.daily,
  protein: (p.sex==='male'?[65,65,60,60,60]:[55,50,50,50,50])[band],
  carbs:[energy.daily*.5/4,energy.daily*.65/4],
  fat:[energy.daily*.15/9,energy.daily*.3/9],
  sodiumAdequate:[1500,1500,1500,1300,1200][band],
  sodiumReduction:[2300,2300,2300,1900,1800][band],
 };
}
export type DailyNutritionReference=ReturnType<typeof dailyNutritionReference>;
