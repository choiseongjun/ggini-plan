import {sanitizeAnalytics, type AnalyticsEvent, type AnalyticsProperties} from './analytics-events';

// Public measurement ID of the existing ggini-plan web stream; not a credential.
export const gaMeasurementId = 'G-H4NP9P7L1K';
export function googleEvent(event: AnalyticsEvent, properties: AnalyticsProperties): {name:string;params:Record<string,unknown>} | null {
 const clean = sanitizeAnalytics(event, properties);
 if (!clean?.screen) return null;
 const params: Record<string, unknown> = {};
 for (const [key,value] of Object.entries(clean)) if (!key.startsWith('$') && key !== 'distinct_id') params[key]=value;
 const screen=String(clean.screen);
 return {name:event==='page_viewed'?'page_view':event,params:{...params,page_title:`끼니플랜 · ${screen}`,page_location:`https://gginiplan.kr/${screen==='home'?'':screen}`,send_to:gaMeasurementId}};
}
type AnalyticsWindow=Window & {dataLayer?:unknown[];gtag?:(...args:unknown[])=>void};
let initialized=false;
export function trackGoogleAnalytics(event:AnalyticsEvent,properties:AnalyticsProperties){
 if(typeof window==='undefined'||navigator.doNotTrack==='1'||!['gginiplan.kr','www.gginiplan.kr'].includes(window.location.hostname))return;
 const payload=googleEvent(event,properties);if(!payload)return;
 const w=window as AnalyticsWindow;
 if(!initialized){
  initialized=true;w.dataLayer=w.dataLayer??[];
  // gtag uses Arguments entries in its command queue.
  // eslint-disable-next-line prefer-rest-params
  w.gtag=w.gtag??function(...args:unknown[]){void args;w.dataLayer!.push(arguments);};
  w.gtag('js',new Date());
  let referrer='';try{referrer=new URL(document.referrer).origin;}catch{}
  w.gtag('config',gaMeasurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:60*60*24*30,page_referrer:referrer,page_location:payload.params.page_location,page_title:payload.params.page_title});
  const script=document.createElement('script');script.async=true;script.id='ggini-ga4';script.src=`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;document.head.appendChild(script);
 }
 w.gtag?.('event',payload.name,payload.params);
}
