// "지금 뭐 먹지?": 지금 시각(KST)과 오늘 이미 기록한 끼니로 추천할 끼니를 정한다.
// 저녁 7시에 연 사람에게 지난 아침·점심까지 추천하지 않는다.
export type NowSlot='breakfast'|'lunch'|'dinner';
const ALL:NowSlot[]=['breakfast','lunch','dinner'];
const LABEL:Record<NowSlot,string>={breakfast:'아침',lunch:'점심',dinner:'저녁'};

export function kstClock(now=new Date()){const kst=new Date(now.getTime()+9*3600000);return {date:kst.toISOString().slice(0,10),minutes:kst.getUTCHours()*60+kst.getUTCMinutes()};}
const nextDay=(date:string)=>new Date(Date.parse(`${date}T00:00:00Z`)+86400000).toISOString().slice(0,10);

export function mealsFromNow(clock:{date:string;minutes:number},eaten:Iterable<string|null|undefined>=[]):{date:string;slots:NowSlot[];label:string;tomorrow:boolean}{
 const done=new Set(eaten);
 const upcoming=clock.minutes<10*60?ALL:clock.minutes<14*60?(['lunch','dinner'] as NowSlot[]):clock.minutes<20*60+30?(['dinner'] as NowSlot[]):[];
 const slots=upcoming.filter(slot=>!done.has(slot));
 if(!slots.length)return {date:nextDay(clock.date),slots:ALL,label:'내일 식단',tomorrow:true};
 return {date:clock.date,slots,label:slots.length===3?'오늘 식단':`오늘 ${slots.map(s=>LABEL[s]).join('·')}`,tomorrow:false};
}
