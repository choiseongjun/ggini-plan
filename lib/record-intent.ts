import {validEatenAt,validMealSlot,type MealSlot} from './meal-time';
export type RecordMode='photo'|'search';
export type RecordTiming={eatenAt:string;mealSlot:MealSlot};
const key='kkini-record-intent';
export function parseRecordIntent(raw:string|null,now=Date.now()):RecordMode|null{
 try{const d=JSON.parse(raw??'null');return d&&(d.mode==='photo'||d.mode==='search')&&Number.isFinite(d.at)&&now>=d.at&&now-d.at<15*60_000?d.mode:null;}catch{return null;}
}
export function pendingRecordMode(){try{return parseRecordIntent(sessionStorage.getItem(key));}catch{return null;}}
export function rememberRecordMode(mode:RecordMode){try{sessionStorage.setItem(key,JSON.stringify({mode,at:Date.now()}));}catch{}}
export function clearRecordMode(){try{sessionStorage.removeItem(key);}catch{}}
// 칼로리 페이지 '먹었어요'로 들어왔다가 로그인하는 동안 고른 음식을 기억한다.
const foodKey='kkini-record-food';
export function rememberRecordFood(code:string,portions=1,timing?:RecordTiming){try{sessionStorage.setItem(foodKey,JSON.stringify({code,portions,timing,at:Date.now()}));}catch{}}
export function pendingRecordTiming(now=Date.now()):RecordTiming|undefined{
 try{const d=JSON.parse(sessionStorage.getItem(foodKey)??'null');return d&&Number.isFinite(d.at)&&now>=d.at&&now-d.at<15*60_000&&validEatenAt(d.timing?.eatenAt,now)&&validMealSlot(d.timing?.mealSlot)?d.timing:undefined;}catch{return undefined;}
}
export function pendingRecordPortions(now=Date.now()){
 try{const d=JSON.parse(sessionStorage.getItem(foodKey)??'null');return d&&now>=d.at&&now-d.at<15*60_000?recordPortions(d.portions):1;}catch{return 1;}
}
export function recordPortions(value:unknown){const n=typeof value==='string'?Number(value):value;return typeof n==='number'&&Number.isFinite(n)&&n>=0.25&&n<=10&&Number.isInteger(n*4)?n:1;}
export function pendingRecordFood(now=Date.now()){
 try{const d=JSON.parse(sessionStorage.getItem(foodKey)??'null');return d&&typeof d.code==='string'&&d.code.length>0&&d.code.length<=80&&Number.isFinite(d.at)&&now>=d.at&&now-d.at<15*60_000?d.code as string:null;}catch{return null;}
}
export function takeRecordFood(now=Date.now()){
 const code=pendingRecordFood(now);try{sessionStorage.removeItem(foodKey);}catch{}return code;
}
