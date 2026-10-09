export const analyticsEvents=['home_auto_recommendation_started','meal_cost_compared','home_video_opened','home_video_ingredients_clicked','home_video_save_clicked','home_video_saved','home_entry_selected','recommendation_pantry_viewed','recommendation_pantry_selected','recommendation_pantry_save_clicked','recommendation_pantry_login_viewed','recommendation_pantry_login_started','recommendation_pantry_login_failed','recommendation_pantry_consent_required','recommendation_pantry_login_succeeded','recommendation_pantry_login_cancelled','recommendation_pantry_saved','recommendation_pantry_save_failed','save_clicked','save_login_viewed','save_login_started','save_login_failed','save_login_succeeded','save_consent_required','save_login_cancelled','save_completed','save_after_login_completed','save_failed','taste_home_midquiz_clicked','taste_home_result_clicked','taste_home_arrived','taste_quiz_opened','taste_invite_opened','taste_quiz_created','taste_guess_completed','taste_friend_created','taste_share_clicked','taste_share_completed','taste_link_copied','taste_card_exported','taste_roulette_started','taste_meal_saved','pantry_cooking_started','pantry_browse_started','pantry_recommended','pantry_menu_selected','landing_cta_clicked','page_viewed','recommendation_started','recommendation_completed','recommendation_failed','menu_details_opened','menu_swapped','record_method_selected','meal_recorded','photo_analysis_started','photo_analysis_completed','photo_analysis_failed','recommendation_refined','push_enabled','push_opened','eat_out_searched','restaurant_opened','seller_opened','plan_shared'] as const;
export type AnalyticsEvent=typeof analyticsEvents[number];
export type AnalyticsSource='kcal'|'push'|'auto';
export const analyticsRefines=['lighter','protein','spicy','soup','meat'] as const;
export type AnalyticsRefine=typeof analyticsRefines[number];
export const analyticsChannels=['kakao','other','link','call','map'] as const;
export type AnalyticsChannel=typeof analyticsChannels[number];
export type AnalyticsProperties={channel?:AnalyticsChannel;screen?:string;entry?:'pantry'|'recommend';source?:AnalyticsSource;refine?:AnalyticsRefine;method?:'photo'|'search'|'manual';duration_ms?:number;photo_count?:number;outcome?:'recorded'|'unrecognized';failure?:'timeout'|'network'|'server'|'rejected';};
const screens:Record<string,string>={'/ingredients':'ingredients','/taste':'taste','/plan':'plan','/recipes':'recipes','/intro':'intro','/':'home','/record':'record','/profile':'profile','/how-to':'guide','/cart':'cart','/eat-out':'eat_out','/convenience':'convenience','/community':'community','/deals':'deals'};
// Dynamic routes report only their section name; ids and slugs never leave the browser.
const sections:Record<string,string>={'/recipes/':'recipes','/kcal/':'kcal','/calendar':'calendar','/compare/':'compare'};
const screenNames=new Set([...Object.values(screens),...Object.values(sections),'kcal']);
export function analyticsScreen(path:string){if(path==='/kcal')return 'kcal';for(const [prefix,screen] of Object.entries(sections))if(path.startsWith(prefix))return screen;return screens[path]??null;}
// An allowlist at the final transport boundary also removes SDK-added URLs/referrers.
export function sanitizeAnalytics(event:string,raw:Record<string,unknown>){
 if(!(analyticsEvents as readonly string[]).includes(event))return null;
 const properties:Record<string,unknown>={$process_person_profile:false,$geoip_disable:true};
 for(const key of ['distinct_id','$device_id','$session_id'])if(typeof raw[key]==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(raw[key]))properties[key]=raw[key];
 if(typeof raw.screen==='string'&&screenNames.has(raw.screen))properties.screen=raw.screen;
 if(['kcal','push','auto'].includes(String(raw.source)))properties.source=raw.source;
 if((analyticsRefines as readonly string[]).includes(String(raw.refine)))properties.refine=raw.refine;
 if((analyticsChannels as readonly string[]).includes(String(raw.channel)))properties.channel=raw.channel;
 if(['pantry','recommend'].includes(String(raw.entry)))properties.entry=raw.entry;
 if(['photo','search','manual'].includes(String(raw.method)))properties.method=raw.method;
 if(['recorded','unrecognized'].includes(String(raw.outcome)))properties.outcome=raw.outcome;
 if(['timeout','network','server','rejected'].includes(String(raw.failure)))properties.failure=raw.failure;
 for(const [key,max] of [['duration_ms',300000],['photo_count',4]] as const)if(typeof raw[key]==='number'&&Number.isFinite(raw[key])&&raw[key]>=0&&raw[key]<=max)properties[key]=Math.round(raw[key]);
 return properties;
}
