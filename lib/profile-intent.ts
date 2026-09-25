const key='kkini-profile-intent';
export function validProfileIntent(raw:string|null,now=Date.now()){
 try{const at=JSON.parse(raw??'null')?.at;return Number.isFinite(at)&&at<=now&&now-at<15*60_000;}catch{return false;}
}
export function rememberProfileIntent(){try{sessionStorage.setItem(key,JSON.stringify({at:Date.now()}));}catch{}}
export function clearProfileIntent(){try{sessionStorage.removeItem(key);}catch{}}
export function takeProfileIntent(){try{const pending=validProfileIntent(sessionStorage.getItem(key));clearProfileIntent();return pending;}catch{return false;}}
