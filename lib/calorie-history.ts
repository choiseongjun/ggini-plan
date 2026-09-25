export function calorieHistoryRange(today:string,period:'week'|'month',offset=0){
 const date=new Date(today+'T00:00:00Z');
 if(period==='week')date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7)+offset*7);
 else{date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+offset);}
 const from=date.toISOString().slice(0,10),end=new Date(date);
 if(period==='week')end.setUTCDate(end.getUTCDate()+6);else end.setUTCMonth(end.getUTCMonth()+1,0);
 const to=end.toISOString().slice(0,10);
 return {from,to,fetchTo:to>today?today:to,days:Math.round((end.getTime()-date.getTime())/86400000)+1};
}
