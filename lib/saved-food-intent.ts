const key='ggini-save-food';
export function rememberSavedFood(code:string){try{sessionStorage.setItem(key,JSON.stringify({code,at:Date.now()}));}catch{}}
export function pendingSavedFood(now=Date.now()):string|null{try{const d=JSON.parse(sessionStorage.getItem(key)??'null');return d&&typeof d.code==='string'&&d.code.length>0&&d.code.length<=100&&Number.isFinite(d.at)&&now>=d.at&&now-d.at<30*60_000?d.code:null;}catch{return null;}}
export function savedFoodReturn(){const code=pendingSavedFood();return code?`/saved-foods?food=${encodeURIComponent(code)}`:null;}
export function clearSavedFood(){try{sessionStorage.removeItem(key);}catch{}}
