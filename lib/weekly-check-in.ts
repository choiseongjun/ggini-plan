export function weeklyCheckIn(logs:readonly {calories?:number|null;protein?:number|null;carbs?:number|null;fat?:number|null}[]){
 const missing=logs.filter(l=>[l.calories,l.protein,l.carbs,l.fat].some(v=>v===null||!Number.isFinite(v))).length;
 return {confirmed:logs.length-missing,missing,text:!logs.length?'오늘 먹은 한 끼부터 남겨 보세요.':missing?`영양정보가 미확인인 음식 ${missing}건이 있어요. 알고 있는 항목만 확인해도 괜찮아요.`:'자주 먹는 한 끼를 다시 불러와 보세요. 다음 기록에서 검색하는 수고를 줄일 수 있어요.',href:missing?'/record':'/'};
}
