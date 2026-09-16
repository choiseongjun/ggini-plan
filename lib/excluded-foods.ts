export const excludedFoods = {
 chicken:'닭고기',beef:'소고기',pork:'돼지고기',duck:'오리고기',
 fish:'생선',shrimp:'새우',crab:'게',squid:'오징어',shellfish:'조개류',
 egg:'달걀',milk:'우유·유제품',soy:'콩·두부',peanut:'땅콩',nuts:'견과류',sesame:'참깨',
 corn:'옥수수·콘시리얼',wheat:'밀',buckwheat:'메밀',oats:'귀리·오트밀',rice:'쌀·밥',
 banana:'바나나',broccoli:'브로콜리',mushroom:'버섯',onion:'양파',garlic:'마늘',tomato:'토마토',
} as const;
export type ExcludedFood = keyof typeof excludedFoods;
export const excludedFoodGroups: {label:string;keys:ExcludedFood[]}[] = [
 {label:'고기',keys:['chicken','beef','pork','duck']},
 {label:'생선·해산물',keys:['fish','shrimp','crab','squid','shellfish']},
 {label:'달걀·유제품·콩·견과',keys:['egg','milk','soy','peanut','nuts','sesame']},
 {label:'곡류',keys:['corn','wheat','buckwheat','oats','rice']},
 {label:'채소·과일',keys:['banana','broccoli','mushroom','onion','garlic','tomato']},
];
export const excludedFoodAliases:Record<ExcludedFood,string[]> = {
 chicken:['닭','치킨'],beef:['소고기','쇠고기','한우','비프'],pork:['돼지','돈육','삼겹','베이컨','햄'],duck:['오리'],
 fish:['생선','연어','참치','고등어','명태','멸치','명란','대구','어묵'],shrimp:['새우','쉬림프'],crab:['게살','꽃게','대게','홍게','게 함유'],squid:['오징어'],shellfish:['조개','굴','홍합','전복','바지락','가리비'],
 egg:['달걀','계란','알류'],milk:['우유','유제품','치즈','요거트','버터','크림'],soy:['콩','두부','대두'],peanut:['땅콩'],nuts:['견과','호두','아몬드','캐슈','피스타치오','잣','마카다미아'],sesame:['참깨','참기름'],
 corn:['옥수수','콘푸라이트','콘플레이크'],wheat:['밀','소맥','파스타'],buckwheat:['메밀'],oats:['귀리','오트밀'],rice:['쌀','밥'],banana:['바나나'],broccoli:['브로콜리'],mushroom:['버섯'],onion:['양파'],garlic:['마늘'],tomato:['토마토'],
};
