export type RecordMode='photo'|'search';
const key='kkini-record-intent';
export function parseRecordIntent(raw:string|null,now=Date.now()):RecordMode|null{
 try{const d=JSON.parse(raw??'null');return d&&(d.mode==='photo'||d.mode==='search')&&Number.isFinite(d.at)&&now>=d.at&&now-d.at<15*60_000?d.mode:null;}catch{return null;}
}
export function pendingRecordMode(){try{return parseRecordIntent(sessionStorage.getItem(key));}catch{return null;}}
export function rememberRecordMode(mode:RecordMode){try{sessionStorage.setItem(key,JSON.stringify({mode,at:Date.now()}));}catch{}}
export function clearRecordMode(){try{sessionStorage.removeItem(key);}catch{}}
// 칼로리 페이지 '먹었어요'로 들어왔다가 로그인하는 동안 고른 음식을 기억한다.
const foodKey='kkini-record-food';
export function rememberRecordFood(code:string){try{sessionStorage.setItem(foodKey,JSON.stringify({code,at:Date.now()}));}catch{}}
export function takeRecordFood(now=Date.now()){
 try{const d=JSON.parse(sessionStorage.getItem(foodKey)??'null');sessionStorage.removeItem(foodKey);return d&&typeof d.code==='string'&&d.code.length<=80&&Number.isFinite(d.at)&&now-d.at<15*60_000?d.code as string:null;}catch{return null;}
}
