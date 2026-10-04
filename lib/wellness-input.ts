import {validPlanDate} from './daily-plan';
import {pantryToday} from './pantry-inventory';
export type WellnessAction={action:'water';ml:number}|{action:'undoWater';id:string}|{action:'weight';kg:number|null}|{action:'settings';waterEnabled:boolean;weightEnabled:boolean;cupMl:number;goalMl:number|null};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function parseWellnessInput(v:unknown,today=pantryToday()):({date:string;version:number;requestId:string}&WellnessAction)|null{
 if(!v||typeof v!=='object')return null;
 const p=v as Record<string,unknown>;
 if(!validPlanDate(p.date)||p.date>today||!Number.isSafeInteger(p.version)||(p.version as number)<0||!uuid(p.requestId))return null;
 const base={date:p.date,version:p.version as number,requestId:p.requestId};
 if(p.action==='water'&&Number.isInteger(p.ml)&&(p.ml as number)>=10&&(p.ml as number)<=2000)return {...base,action:'water',ml:p.ml as number};
 if(p.action==='undoWater'&&uuid(p.id))return {...base,action:'undoWater',id:p.id};
 if(p.action==='weight'&&(p.kg===null||typeof p.kg==='number'&&Number.isFinite(p.kg)&&p.kg>=25&&p.kg<=350&&Math.abs(p.kg*10-Math.round(p.kg*10))<1e-7))return {...base,action:'weight',kg:p.kg as number|null};
 if(p.action==='settings'&&typeof p.waterEnabled==='boolean'&&typeof p.weightEnabled==='boolean'&&Number.isInteger(p.cupMl)&&(p.cupMl as number)>=10&&(p.cupMl as number)<=2000&&(p.goalMl===null||Number.isInteger(p.goalMl)&&(p.goalMl as number)>=100&&(p.goalMl as number)<=10000))return {...base,action:'settings',waterEnabled:p.waterEnabled,weightEnabled:p.weightEnabled,cupMl:p.cupMl as number,goalMl:p.goalMl as number|null};
 return null;
}
