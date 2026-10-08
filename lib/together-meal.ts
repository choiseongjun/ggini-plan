export const modes={home:'집에서',out:'외식',store:'편의점'} as const;
export type Mode=keyof typeof modes;
export type Meal={id:string;name:string;description:string;tags:string[]};
const rows:Record<Mode,string[][]>={
 home:[['h1','간장 닭덮밥','한 그릇으로 간단하게','닭고기'],['h2','토마토 파스타','둘이 나눠 만드는 저녁','밀'],['h3','참치마요 주먹밥','불 없이 가볍게','해산물'],['h4','두부 버섯전골','따뜻한 국물이 생각날 때','콩'],['h5','제육볶음','밥 한 공기와 든든하게','돼지고기','매운 음식'],['h6','새우볶음밥','팬 하나로 뚝딱','해산물'],['h7','소고기 불고기','달짝지근한 한 끼','소고기'],['h8','감자 오믈렛','부담 없이 부드럽게','달걀']],
 out:[['o1','닭갈비','매콤한 한 판을 함께','닭고기','매운 음식'],['o2','샤브샤브','따뜻하게 천천히','소고기'],['o3','돈까스','바삭한 메뉴가 당길 때','돼지고기','밀'],['o4','초밥','깔끔하게 한 끼','해산물'],['o5','쌀국수','부담 적은 국물 메뉴','소고기'],['o6','버섯 비빔밥','채소와 함께 든든하게'],['o7','크림 파스타','오늘은 조금 느긋하게','우유','밀'],['o8','김치찌개','익숙하고 든든하게','돼지고기','매운 음식']],
 store:[['s1','참치 삼각김밥 + 삶은 달걀','간편하게 챙기는 한 끼','해산물','달걀'],['s2','닭가슴살 샐러드','가볍게 먹고 싶은 날','닭고기'],['s3','불고기 도시락','따뜻하고 든든하게','소고기'],['s4','에그 샌드위치','간단하게 나눠 먹어요','밀','달걀'],['s5','컵떡볶이 + 주먹밥','매콤한 조합','매운 음식'],['s6','유부초밥 + 두유','고기 없이 간단하게','콩'],['s7','치즈 샌드위치','고소한 한 끼','밀','우유'],['s8','비빔밥 도시락','채소를 곁들여서']],
};
// Keep the prototype catalogue explicit; no fabricated prices or product availability.
const parse=(items:string[][]):Meal[]=>items.map(([id,name,description,...tags])=>({id,name,description,tags}));
export const menus:Record<Mode,Meal[]>={home:parse(rows.home),out:parse(rows.out),store:parse(rows.store)};
export const avoidOptions=['매운 음식','해산물','돼지고기','소고기','닭고기','밀','우유','달걀','콩'];
export function commonMeals(mode:Mode,votes:[string[],string[]],avoids:[string[],string[]]){
 return menus[mode].filter(m=>votes.every(v=>v.includes(m.id))&&!m.tags.some(t=>avoids.some(a=>a.includes(t))));
}
