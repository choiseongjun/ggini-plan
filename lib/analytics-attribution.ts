export const entrySources=['kcal','push','threads','instagram'] as const;
export type EntrySource=typeof entrySources[number];
export const entryCampaigns=['recording-restart','meal-reuse'] as const;
export type EntryCampaign=typeof entryCampaigns[number];
type Attribution={source:EntrySource;campaign?:EntryCampaign;createdAt:number};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>;
export const attributionStorageKey='ggini-entry-attribution-v1';
const maxAge=30*60*1000;
function source(value:unknown):value is EntrySource{return entrySources.some(item=>item===value);}
function campaign(value:unknown):value is EntryCampaign{return entryCampaigns.some(item=>item===value);}
export function attributionFromSearch(search:string,now=Date.now()):Attribution|null{
 const query=new URLSearchParams(search),from=query.get('from'),utm=query.get('utm_source');
 const entry=source(from)?from:source(utm)?utm:null;if(!entry)return null;
 const code=query.get('utm_campaign');return {source:entry,...(campaign(code)?{campaign:code}:{}),createdAt:now};
}
export function parseAttribution(raw:string|null,now=Date.now()):Attribution|null{
 try{const value=JSON.parse(raw??'null');
  if(!value||!source(value.source)||!Number.isFinite(value.createdAt)||value.createdAt>now||now-value.createdAt>=maxAge)return null;
  return {source:value.source,...(campaign(value.campaign)?{campaign:value.campaign}:{}),createdAt:value.createdAt};
 }catch{return null;}
}
export function entryAttribution(storage:Storage|null,search:string,now=Date.now()):{source?:EntrySource;campaign?:EntryCampaign}{
 const incoming=attributionFromSearch(search,now);let saved:Attribution|null=null;
 try{saved=parseAttribution(storage?.getItem(attributionStorageKey)??null,now);}catch{/* optional telemetry */}
 // Do not extend the attribution window on every click while the query remains in the URL.
 const next=incoming&&saved&&incoming.source===saved.source&&incoming.campaign===saved.campaign?saved:incoming??saved;
 if(!next)return {};
 try{storage?.setItem(attributionStorageKey,JSON.stringify(next));}catch{/* recording must still work */}
 return {source:next.source,...(next.campaign?{campaign:next.campaign}:{})};
}
