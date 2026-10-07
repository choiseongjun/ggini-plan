export const tasteFoods=[
 {name:'돈가스',line:'한 입 베어 물면, 바삭.',tag:'바삭한 한 입'},
 {name:'김치찌개',line:'뜨끈한 국물에 밥 한 술.',tag:'뜨끈한 국물'},
 {name:'떡볶이',line:'매콤달콤, 한 입만 더.',tag:'매콤한 자극'},
 {name:'비빔밥',line:'색색의 재료를 한 숟가락에.',tag:'다채로운 한 그릇'},
 {name:'크림파스타',line:'오늘은 부드럽게 감기는 맛.',tag:'부드러운 소스'},
 {name:'제육볶음',line:'불맛 가득, 밥이 생각나는 맛.',tag:'든든한 밥심'},
] as const;
export function parseTaste(value:unknown):number|null{return typeof value==='string'&&/^(0|[1-9][0-9]?)$/.test(value)&&Number(value)<64?Number(value):null;}
export function tasteMask(answers:boolean[]){return answers.reduce((n,yes,i)=>n+(yes?2**i:0),0);}
export function tasteResult(mask:number){
 const liked=tasteFoods.filter((_,i)=>Boolean(mask&(1<<i)));
 const title=liked.length===0?'오늘은 새로운 맛이 필요한 날':liked.length===6?'맛있는 건 못 참는 모험가':(mask&1)&&(mask&2)?'바삭하게 시작해, 국물로 마무리':(mask&4)&&(mask&32)?'매콤한 한 입에 진심인 사람':(mask&16)?'부드러운 한 입의 여유':(mask&8)?'한 그릇에 다 담는 취향':(mask&2)?'국물 한 술에 마음이 풀리는 사람':(mask&1)?'바삭한 소리에 약한 사람':'밥심으로 하루를 채우는 사람';
 return {liked,title};
}
