// Operator and test devices skip all product measurement so their own use does not inflate retention or funnels.
const storageKey='ggini-internal-device';
export function isInternalDevice(){
 if(typeof window==='undefined')return false;
 // Page effects can fire before the parameter is stored, so the marking visit itself is checked directly.
 const param=new URLSearchParams(window.location.search).get('internal');
 if(param==='1'||param==='0')return param==='1';
 try{return window.localStorage.getItem(storageKey)==='1';}catch{return false;}
}
export function setInternalDevice(internal:boolean){
 try{if(internal)window.localStorage.setItem(storageKey,'1');else window.localStorage.removeItem(storageKey);}catch{/* Storage can be unavailable; measurement then stays on. */}
}
// `?internal=1` marks this browser and `?internal=0` clears it; the parameter is removed from the address bar.
export function applyInternalParam(){
 if(typeof window==='undefined')return;
 const url=new URL(window.location.href),value=url.searchParams.get('internal');
 if(value!=='1'&&value!=='0')return;
 setInternalDevice(value==='1');
 url.searchParams.delete('internal');
 window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`);
}
