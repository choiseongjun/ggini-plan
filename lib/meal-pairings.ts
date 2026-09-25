import type {PlanProduct} from './shopping-plan';
import {servingNutrients} from './serving-nutrients';
export type Template={id:string;name:string;slots:{role:string;min:number;max:number;included?:boolean}[];enabled:boolean};
export const templates:Template[]=[
 {id:'rice-meal',name:'밥과 반찬 한 상',enabled:true,slots:[{role:'main',min:1,max:1},{role:'staple',min:1,max:1,included:true},{role:'side',min:1,max:2}]},
 {id:'pasta-meal',name:'파스타와 곁들임',enabled:false,slots:[{role:'main',min:1,max:1},{role:'salad',min:0,max:1}]},
 {id:'light-meal',name:'샌드위치·샐러드 한 끼',enabled:false,slots:[{role:'main',min:1,max:1},{role:'side',min:0,max:1},{role:'drink',min:0,max:1}]},
 {id:'taco-meal',name:'타코와 곁들임',enabled:false,slots:[{role:'main',min:1,max:1},{role:'side',min:0,max:1},{role:'sauce',min:0,max:1}]},
 {id:'complete-meal',name:'도시락·외식 완성 메뉴',enabled:false,slots:[{role:'main',min:1,max:1}]},
];
export type Pairing={id?:string;anchor_id:string;companion_id:string;template_id:string;slot:string;relation_type:'pairing'|'substitute'|'avoid_pairing';score:number;reason:string;score_details:Record<string,number>;source:string;status:'suggested'|'approved'|'excluded'};
// Initial proposals use existing AI classifications and explicit rules; scores are not probabilities.
export function proposePairings(mains:PlanProduct[],sides:PlanProduct[]):Pairing[]{
 const spicy=(p:PlanProduct)=>/고추장|고춧가루|청양|매운/.test(p.avoidanceText??p.name);
 return mains.flatMap(main=>{
  if(!main.recipe?.ingredients.some(i=>i.label.startsWith('함께 먹는 밥')))return [];
  const names=new Set(main.recipe.ingredients.filter(i=>i.product.price>0).map(i=>i.product.name));
  return sides.filter(s=>s.id!==main.id&&s.recipe&&s.price>0&&!/돼지|소고기|닭고기|삼겹|불고기|제육/.test(s.name)).map(side=>{
   const score_details={role:60,mild:spicy(main)?(spicy(side)?-25:15):0,vegetable:/나물|무침|샐러드/.test(side.name)?10:0,reuse:side.recipe!.ingredients.some(i=>names.has(i.product.name))?5:0};
   const reason=['밥을 포함한 메인 + 소량 반찬',score_details.mild>0?'매운 메인에 맵지 않은 반찬':score_details.mild<0?'매운맛 중복 감점':'',score_details.vegetable?'채소 곁들임 후보':'',score_details.reuse?'구매 재료 공유 가능':''].filter(Boolean).join(' · ');
   return {anchor_id:main.id,companion_id:side.id,template_id:'rice-meal',slot:'side',relation_type:'pairing' as const,score:Object.values(score_details).reduce((a,b)=>a+b,0),reason,score_details,source:'classification-rules-v1',status:'suggested' as const};
  }).sort((a,b)=>b.score-a.score||a.companion_id.localeCompare(b.companion_id)).slice(0,4);
 });
}
export function composePairing(main:PlanProduct,sides:PlanProduct[],relations:Pairing[]=[]):PlanProduct{
 if(!main.recipe||!sides.length||sides.some(s=>!s.recipe))return main;
 const ingredients=[...main.recipe.ingredients,...sides.flatMap(s=>s.recipe!.ingredients.map(i=>({...i,group:s.name})))];
 const nutrients=[main,...sides].map(servingNutrients);
 const sum=(key:'calories'|'protein')=>nutrients.every(n=>n[key]!==null)?Math.round(nutrients.reduce((n,v)=>n+v[key]!,0)*10)/10:null;
 return {...main,id:`${main.id}--sides-${sides.length}-${sides.map(s=>s.id.replace(/^recipe-opt-/, '')).join('_')}`,name:`${main.name} + ${sides.map(s=>s.name).join(' + ')}`,
  detail:`${main.detail} · 함께 먹는 밥과 곁들임 포함 · 조합 규칙 v1`,
  price:Math.round(ingredients.reduce((n,i)=>n+i.product.price*i.packs,0)),servingGrams:(main.servingGrams??0)+sides.reduce((n,s)=>n+(s.servingGrams??0),0),
  avoidanceText:[main,...sides].every(p=>p.avoidanceText!==null)?[main,...sides].map(p=>p.avoidanceText).join(' '):null,
  allergens:[...new Set([main,...sides].flatMap(p=>p.allergens??[]))],
  recipe:{...main.recipe,sideCount:sides.length,ingredients,nutrition:{calories:sum('calories'),protein:sum('protein')},minutes:main.recipe.minutes+sides.reduce((n,s)=>n+s.recipe!.minutes,0),
   composition:{templateId:relations[0]?.template_id??'rice-meal',version:1,items:[{id:main.id,role:'main',reason:'메인과 기본 주식'},...sides.map(s=>({id:s.id,role:relations.find(r=>r.companion_id===s.id)?.slot??'side',reason:relations.find(r=>r.companion_id===s.id)?.reason??'조합 미리보기'}))]},
   sides:sides.map(s=>({name:s.name,steps:s.recipe!.steps,minutes:s.recipe!.minutes})),steps:[...main.recipe.steps,...sides.flatMap(s=>s.recipe!.steps.map(step=>`${s.name}: ${step}`))]}};
}
export function applyPairings(mains:PlanProduct[],sides:PlanProduct[],relations:Pairing[],configs:Template[]=templates):PlanProduct[]{
 const byId=new Map(sides.map(s=>[s.id,s]));
 return mains.flatMap(main=>{
  const rows=relations.filter(r=>r.anchor_id===main.id&&r.status==='approved');
  const blocked=new Set(rows.filter(r=>r.relation_type==='avoid_pairing').map(r=>r.companion_id));
  const chosen=rows.filter(r=>r.relation_type==='pairing'&&!blocked.has(r.companion_id)&&byId.has(r.companion_id)&&configs.some(t=>t.id===r.template_id&&t.enabled&&t.slots.some(s=>s.role===r.slot&&s.max>0)))
   .sort((a,b)=>b.score-a.score||a.companion_id.localeCompare(b.companion_id));
  // Only the rice-meal adapter is enabled initially. Other templates remain review-only until portions/roles are linked.
  const unique=[...new Map(chosen.filter(r=>r.template_id==='rice-meal'&&r.slot==='side').map(r=>[r.companion_id,r])).values()].slice(0,2);
  if(!main.recipe?.ingredients.some(i=>i.label.startsWith('함께 먹는 밥')))return [main];
  return [main,...unique.map(r=>composePairing(main,[byId.get(r.companion_id)!],[r])),...(unique.length===2&&!relations.some(r=>r.status==='approved'&&r.relation_type==='avoid_pairing'&&((r.anchor_id===unique[0].companion_id&&r.companion_id===unique[1].companion_id)||(r.anchor_id===unique[1].companion_id&&r.companion_id===unique[0].companion_id)))?[composePairing(main,unique.map(r=>byId.get(r.companion_id)!),unique)]:[])];
 });
}
