// 알림에 담을 "이번 끼니 메뉴 하나": 저장한 식단이 없는 회원·비회원에게 질문 대신 답을 보낸다.
// 홈의 단순 추천과 같은 조건(간편 요리, 곁들임 없이 한 그릇)에서 그 끼니 후보를 고르고, 기기·날짜마다 다르게 고른다.
import {createHash} from 'node:crypto';
import {initialHomeConditions,slotCandidates,type MealSlot,type PlanConditions,type PlanProduct} from './shopping-plan';
import {servingNutrition} from './food-intake';

const conditionsFor=(slot:MealSlot):PlanConditions=>({...initialHomeConditions,days:1,meals:1,slots:[slot],sideCount:0,mealSideCounts:{breakfast:0,lunch:0,dinner:0},budgetUnlimited:true,cookingEffort:'easy'});

export type PushMenu={id:string;name:string;price:number;kcal:number};
// 데이터 이름은 "분류_이름"(덮밥_해물, 샌드위치_단호박크림치즈 샌드위치) 형식이라 알림에는 부르는 이름으로 바꾼다.
const DISH_KINDS=['덮밥','볶음밥','비빔밥','김밥','샌드위치','토스트','국수','죽','카레','파스타','샐러드','오믈렛'];
export function spokenMenuName(raw:string){
 const parts=raw.split('_').map(part=>part.trim()).filter(Boolean);
 if(parts.length!==2)return parts.join(' ');
 const [kind,name]=parts;
 if(name.includes(kind))return name;
 if(DISH_KINDS.includes(kind))return `${name.replace(/\s+/g,'')}${kind}`;
 return `${kind} ${name}`;
}
export function pushMenuFor(products:PlanProduct[],slot:MealSlot,day:string,seed:string):PushMenu|null{
 const pool=slotCandidates(products,conditionsFor(slot),0).filter(p=>servingNutrition(p).calories!==null&&p.servings>0&&p.price>0).sort((a,b)=>a.id.localeCompare(b.id));
 if(!pool.length)return null;
 const pick=pool[createHash('sha256').update(`${seed}:${day}:${slot}`).digest().readUInt32BE(0)%pool.length];
 return {id:pick.id,name:spokenMenuName(pick.name),price:Math.round(pick.price/pick.servings/10)*10,kcal:Math.round(servingNutrition(pick).calories!)};
}

const LABEL:Record<MealSlot,string>={breakfast:'아침',lunch:'점심',dinner:'저녁'};
export function pushMenuMessage(menu:PushMenu,slot:MealSlot){
 return {
  title:`오늘 ${LABEL[slot]} ${menu.name} 어때요?`,
  body:`1인분 약 ${menu.price.toLocaleString('ko-KR')}원 · ${menu.kcal.toLocaleString('ko-KR')}kcal · 누르면 만드는 법까지 바로 볼 수 있어요.`,
  // 앱은 '/'·'/record'·'/profile' 경로만 열어 준다. 홈이 meal·slot을 읽어 그 메뉴로 오늘 끼니를 채운다.
  url:`/?from=push&meal=${encodeURIComponent(menu.id)}&slot=${slot}`,
 };
}
