import type {CatalogItem} from './catalog';

export type TaiwanProduct=CatalogItem & {servings:number;slots:('lunch'|'dinner')[]};
export type TaiwanSettings={days:number;slots:('lunch'|'dinner')[];budgetMinor:number};
export type TaiwanMeal={id:string;productId:string;date:string;slot:'lunch'|'dinner';prepared:boolean;eaten:boolean};
export const taiwanStorageKey='kkiniplan:TW:zh-TW:v1';
export const twMoney=(minor:number)=>`NT$${new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(minor/100)}`;
export function taipeiToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validTaiwanSettings(value:unknown):value is TaiwanSettings{
 if(!value||typeof value!=='object')return false;
 const s=value as TaiwanSettings;
 return Number.isInteger(s.days)&&s.days>=1&&s.days<=15&&Number.isSafeInteger(s.budgetMinor)&&s.budgetMinor>0&&s.budgetMinor<=10000000&&Array.isArray(s.slots)&&s.slots.length>0&&s.slots.length<=2&&new Set(s.slots).size===s.slots.length&&s.slots.every(x=>x==='lunch'||x==='dinner');
}
export function taiwanProductsOnly(products:TaiwanProduct[]){return products.filter(p=>p.market==='TW'&&p.currency==='TWD'&&p.locale==='zh-TW'&&p.minorUnits===2&&Number.isSafeInteger(p.price)&&p.price>0&&p.servings===1&&p.productUrl?.startsWith('https://'));}
// One reviewed retail pack per meal. Prefer less-used products, while reserving
// enough budget for every remaining meal. Never return a partially funded plan.
export function buildTaiwanPlan(products:TaiwanProduct[],settings:TaiwanSettings,startDate=taipeiToday(),random:()=>number=Math.random):TaiwanMeal[]{
 if(!validTaiwanSettings(settings)||!/^\d{4}-\d{2}-\d{2}$/.test(startDate))return [];
 const items=taiwanProductsOnly(products),slots=Array.from({length:settings.days},()=>settings.slots).flat();
 const choices=slots.map(slot=>items.filter(p=>p.slots.includes(slot)));
 if(choices.some(x=>!x.length))return [];
 const minimum=choices.map(ps=>Math.min(...ps.map(p=>p.price)));
 if(minimum.reduce((a,b)=>a+b,0)>settings.budgetMinor)return [];
 let remaining=settings.budgetMinor;const used=new Map<string,number>();const result:TaiwanMeal[]=[];
 for(let i=0;i<slots.length;i++){
  const reserve=minimum.slice(i+1).reduce((a,b)=>a+b,0);
  const candidates=choices[i].filter(p=>p.price<=remaining-reserve).map(p=>({p,rank:(used.get(p.id)??0)*10+(result.at(-1)?.productId===p.id?5:0)+random()})).sort((a,b)=>a.rank-b.rank);
  const p=candidates[0].p;remaining-=p.price;used.set(p.id,(used.get(p.id)??0)+1);
  const date=new Date(`${startDate}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+Math.floor(i/settings.slots.length));
  result.push({id:crypto.randomUUID(),productId:p.id,date:date.toISOString().slice(0,10),slot:slots[i],prepared:false,eaten:false});
 }
 return result;
}
export function restoreTaiwanPlan(raw:string,products:TaiwanProduct[]):{settings:TaiwanSettings;meals:TaiwanMeal[]}|null{
 try{const v=JSON.parse(raw);if(v.market!=='TW'||v.currency!=='TWD'||!validTaiwanSettings(v.settings)||!Array.isArray(v.meals)||v.meals.length>30)return null;
 const ids=new Set(taiwanProductsOnly(products).map(p=>p.id));
 if(!v.meals.every((m:TaiwanMeal)=>m&&typeof m.id==='string'&&ids.has(m.productId)&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&['lunch','dinner'].includes(m.slot)&&typeof m.prepared==='boolean'&&typeof m.eaten==='boolean'&&(!m.eaten||m.prepared))||new Set(v.meals.map((m:TaiwanMeal)=>m.id)).size!==v.meals.length)return null;
 return {settings:v.settings,meals:v.meals};}catch{return null;}
}
