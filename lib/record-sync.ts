// Refresh server-owned records on return to the app and while another device may be editing.
export function subscribeRecordSync(refresh:()=>void,intervalMs=60_000){
 const visible=()=>{if(document.visibilityState==='visible')refresh();};
 window.addEventListener('focus',visible);window.addEventListener('online',visible);document.addEventListener('visibilitychange',visible);
 const timer=window.setInterval(visible,intervalMs);
 return()=>{window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible);window.clearInterval(timer);};
}
