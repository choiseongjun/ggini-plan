export type RecordMode='photo'|'search';
const key='kkini-record-intent';
export function parseRecordIntent(raw:string|null,now=Date.now()):RecordMode|null{
 try{const d=JSON.parse(raw??'null');return d&&(d.mode==='photo'||d.mode==='search')&&Number.isFinite(d.at)&&now>=d.at&&now-d.at<15*60_000?d.mode:null;}catch{return null;}
}
export function pendingRecordMode(){try{return parseRecordIntent(sessionStorage.getItem(key));}catch{return null;}}
export function rememberRecordMode(mode:RecordMode){try{sessionStorage.setItem(key,JSON.stringify({mode,at:Date.now()}));}catch{}}
export function clearRecordMode(){try{sessionStorage.removeItem(key);}catch{}}
