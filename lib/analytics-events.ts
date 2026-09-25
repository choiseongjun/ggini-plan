export const analyticsEvents=['page_viewed','recommendation_started','recommendation_completed','recommendation_failed','menu_details_opened','menu_swapped','record_method_selected','meal_recorded','photo_analysis_started','photo_analysis_completed','photo_analysis_failed'] as const;
export type AnalyticsEvent=typeof analyticsEvents[number];
export type AnalyticsProperties={screen?:string;method?:'photo'|'search'|'manual';duration_ms?:number;photo_count?:number;outcome?:'recorded'|'unrecognized';failure?:'timeout'|'network'|'server'|'rejected';};
const screens:Record<string,string>={'/':'home','/record':'record','/profile':'profile','/how-to':'guide','/cart':'cart'};
export function analyticsScreen(path:string){return screens[path]??null;}
// An allowlist at the final transport boundary also removes SDK-added URLs/referrers.
export function sanitizeAnalytics(event:string,raw:Record<string,unknown>){
 if(!(analyticsEvents as readonly string[]).includes(event))return null;
 const properties:Record<string,unknown>={$process_person_profile:false,$geoip_disable:true};
 for(const key of ['distinct_id','$device_id','$session_id'])if(typeof raw[key]==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(raw[key]))properties[key]=raw[key];
 if(typeof raw.screen==='string'&&Object.values(screens).includes(raw.screen))properties.screen=raw.screen;
 if(['photo','search','manual'].includes(String(raw.method)))properties.method=raw.method;
 if(['recorded','unrecognized'].includes(String(raw.outcome)))properties.outcome=raw.outcome;
 if(['timeout','network','server','rejected'].includes(String(raw.failure)))properties.failure=raw.failure;
 for(const [key,max] of [['duration_ms',300000],['photo_count',4]] as const)if(typeof raw[key]==='number'&&Number.isFinite(raw[key])&&raw[key]>=0&&raw[key]<=max)properties[key]=Math.round(raw[key]);
 return properties;
}
