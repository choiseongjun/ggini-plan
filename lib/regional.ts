export type MarketContext={market:string;currency:string;minorUnits:number;locale:string;timeZone:string;status:'active'|'preview'|'disabled'};
export const korea:MarketContext={market:'KR',currency:'KRW',minorUnits:0,locale:'ko-KR',timeZone:'Asia/Seoul',status:'active'};
export function validTimeZone(value:unknown):value is string{
 if(typeof value!=='string'||value.length>100||! /^(?:UTC|[A-Za-z_]+\/[A-Za-z0-9_+\-/]+)$/.test(value))return false;
 try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return true;}catch{return false;}
}
export function localDate(timeZone:string,now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function moneyFromMajor(value:string,minorUnits:number){
 if(!Number.isInteger(minorUnits)||minorUnits<0||minorUnits>4||!/^\d+(?:\.\d+)?$/.test(value))throw new Error('Invalid money');
 const [whole,fraction='']=value.split('.');
 if(fraction.length>minorUnits)throw new Error('Too many decimal places');
 const amount=BigInt(whole)*BigInt(10)**BigInt(minorUnits)+BigInt(fraction.padEnd(minorUnits,'0')||'0');
 if(amount>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Money exceeds safe integer');
 return Number(amount);
}
export function formatMoney(amountMinor:number,context:Pick<MarketContext,'currency'|'minorUnits'|'locale'>){
 if(!Number.isSafeInteger(amountMinor)||amountMinor<0)throw new Error('Invalid minor-unit amount');
 return new Intl.NumberFormat(context.locale,{style:'currency',currency:context.currency,minimumFractionDigits:context.minorUnits,maximumFractionDigits:context.minorUnits}).format(amountMinor/10**context.minorUnits);
}
