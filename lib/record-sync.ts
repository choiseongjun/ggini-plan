// Local edits dispatch their own events. Refresh other-device changes on return/reconnect,
// instead of issuing server requests every minute while an idle tab stays open.
export function subscribeRecordSync(refresh:()=>void,intervalMs=0){
 const visible=()=>{if(document.visibilityState==='visible')refresh();};
 window.addEventListener('focus',visible);window.addEventListener('online',visible);document.addEventListener('visibilitychange',visible);
 const timer=intervalMs>0?window.setInterval(visible,intervalMs):null;
 return()=>{window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible);if(timer!==null)window.clearInterval(timer);};
}
