export const buddyStages = [
  {days:0, name:'처음 만난 끼니', gift:'나무 스푼', message:'안녕! 오늘 먹은 한 끼부터 같이 챙겨보자.'},
  {days:1, name:'한 끼 친구', gift:'민트 스카프', message:'첫 기록 고마워. 네 식사를 조금씩 알아갈게.'},
  {days:3, name:'든든한 짝꿍', gift:'작은 앞치마', message:'잘 먹는 습관, 우리 제법 잘 맞는데?'},
  {days:7, name:'식탁 도우미', gift:'새싹 브로치', message:'바쁜 날에도 한 끼씩. 내가 옆에서 챙겨줄게.'},
  {days:14, name:'나만의 식사 친구', gift:'요리사 모자', message:'이제 네 식탁이 익숙해졌어. 오늘도 같이 먹자.'},
  {days:30, name:'오래가는 단짝', gift:'햇살 메달', message:'우리가 함께 쌓은 일상이야. 앞으로도 천천히 가자.'},
] as const;

export function buddyGrowth(recordedDays:number) {
  const days=Number.isFinite(recordedDays)?Math.max(0,Math.floor(recordedDays)):0;
  let stage=0;
  for(let i=1;i<buddyStages.length;i++)if(days>=buddyStages[i].days)stage=i;
  const current=buddyStages[stage],next=buddyStages[stage+1]??null;
  return {...current,days,stage,level:stage+1,next,
    remaining:next?next.days-days:0,
    percent:next?Math.round((days-current.days)/(next.days-current.days)*100):100};
}
