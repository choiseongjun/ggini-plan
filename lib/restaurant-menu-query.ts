// Shared by the browser and API: nutrition labels are not restaurant search terms.
// Keep dish identity, remove serving/preparation metadata, then widen within its family.
const families:Array<[RegExp,string[]]>=[
 [/닭갈비/,['닭갈비','닭볶음','닭요리']],
 [/닭볶음탕|닭도리탕/,['닭볶음탕','닭도리탕','닭요리']],
 [/찜닭/,['찜닭','닭볶음탕','닭요리']],
 [/닭볶음/,['닭볶음','닭갈비','닭볶음탕']],
 [/삼계탕|백숙/,['삼계탕','백숙','닭요리']],
 [/제육|두루치기/,['제육볶음','두루치기','백반']],
 [/돈까스|카츠|가츠/,['돈까스','돈가스','일식']],
 [/회덮밥|초밥|스시|사케동/,['초밥','회덮밥','일식']],
 [/짜장|짬뽕|기스면|울면|탕수|깐풍|깐쇼|난자완스|유산슬|팔보채|마파|양장피|마라|고추잡채/,['중식','중국집']],
 [/파스타|스파게티|리조또|그라탕|필라프/,['파스타','이탈리안']],
 [/샌드위치|토스트/,['샌드위치','브런치']],
 [/샐러드|포케|월남쌈/,['샐러드','포케']],
 [/햄버거|버거/,['햄버거','수제버거']],
 [/피자/,['피자','이탈리안']],
 [/스테이크/,['스테이크','양식']],
 [/치킨|닭튀김/,['치킨','닭요리']],
 [/순두부|두부/,['순두부','두부요리','찌개']],
 [/청국장|된장찌개/,['청국장','된장찌개','한식']],
 [/샤브샤브/,['샤브샤브','전골']],
 [/찌개|전골/,['찌개','전골','한식']],
 [/매운탕|지리|해물탕|알탕/,['매운탕','해물탕','생선요리']],
 [/냉국|묵말이/,['백반','한식']],
 [/만두국|떡국|떡만두국/,['떡국','만두국','만두']],
 [/국밥|국$|탕$|곰탕|설렁탕|육개장|게국지/,['국밥','곰탕','해장국']],
 [/불고기/,['불고기','백반']],
 [/삼겹|목살|갈비구이|곱창|막창|대창|항정|차돌/,['고기구이','고깃집']],
 [/보쌈|족발|수육/,['보쌈','족발']],
 [/오리/,['오리구이','오리요리']],
 [/냉면|막국수/,['냉면','막국수']],
 [/쌀국수/,['쌀국수','베트남음식']],
 [/칼국수|수제비|국수/,['국수','칼국수']],
 [/라멘|우동|소바|모밀/,['우동','일식']],
 [/떡볶이|라볶이|쫄볶이|김밥|순대|쫄면|라면|만두|어묵/,['분식','김밥']],
 [/롤$|물회|모듬회/,['초밥','횟집']],
 [/오므라이스|하이라이스|오믈렛/,['오므라이스','양식']],
 [/카레|커리/,['카레','커리']],
 [/비빔밥|덮밥|볶음밥|밥$|규동|텐동/,['비빔밥','덮밥','한식']],
 [/죽$|수프|스프/,['죽','수프']],
 [/아귀|아구|해물찜/,['아귀찜','해물찜']],
 [/생선|고등어|갈치|가자미|북어|황태|명태|동태|코다리|꽁치|조기|삼치|장어/,['생선요리','생선구이']],
 [/볶음|구이|조림|찜|무침|나물|전$|잡채|냉채|빈대떡|산적|화양적|생채|겉절이|김치|누룽지/,['백반','한식']],
];
const categoryQueries:Record<string,string[]>={
 '밥류':['백반','한식'],'면 및 만두류':['국수','분식'],'국 및 탕류':['국밥','한식'],
 '찌개 및 전골류':['찌개','전골'],'볶음류':['백반','한식'],'구이류':['구이','한식'],
 '조림류':['백반','한식'],'찜류':['찜요리','한식'],'튀김류':['튀김','분식'],
 '전·적 및 부침류':['전집','한식'],'죽 및 스프류':['죽','수프'],'빵 및 과자류':['베이커리','브런치'],
};
const dishEnding=/(?:볶음밥|비빔밥|덮밥|국밥|초밥|김밥|찌개|전골|칼국수|막국수|쌀국수|국수|냉면|라멘|라면|우동|소바|수제비|만두|떡볶이|라볶이|돈까스|카츠|파스타|스파게티|리조또|샐러드|샌드위치|스테이크|햄버거|버거|토스트|피자|치킨|불고기|갈비|백숙|보쌈|족발|수육|탕수육|깐풍기|유산슬|팔보채|짜장|짬뽕|카레|커리|볶음|구이|조림|잡채|냉채|무침|국|탕|찜|죽|전|밥|면)$/;
const generic=/^(국|탕|찜|죽|전|밥|면|국수|냉면|만두|구이|볶음|조림|덮밥|볶음밥|비빔밥|국밥|찌개|전골|샐러드|샌드위치)$/;
const normalize=(s:string)=>s.normalize('NFKC').replace(/자장/g,'짜장').replace(/돈가스|돈까쓰/g,'돈까스').replace(/리소토/g,'리조또').replace(/아구/g,'아귀');
const clean=(s:string)=>normalize(s)
 .replace(/\d+(?:\.\d+)?\s*(?:인분|인용|kcal|그램|그람|kg|mg|ml|g|공기|개)(?![a-z])/gi,' ')
 .replace(/(?:매운|순한|간장|고추장)\s*양념|양념소스|소스첨가|치즈추가|토핑추가|공깃밥|공기밥/g,' ')
 .replace(/[^가-힣a-zA-Z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

export function restaurantMenuQuery(menu:string,category?:string|null){
 const dish=menu.split(/\s*\+\s*/)[0];
 const aliases=Array.from(dish.matchAll(/\(([^)]*)\)/g),m=>clean(m[1]).replace(/\s/g,''));
 const parts=dish.replace(/\([^)]*\)/g,'').split(/[_·,\/]/).map(clean).filter(Boolean);
 const head=parts[0]??clean(dish);
 // A parenthetical dish alias is valuable; serving sizes and ingredient notes aren't.
 const alias=aliases.find(s=>dishEnding.test(s)||s==='제육');
 const tokens=head.split(' ').filter(s=>!/^(매운|순한|양념|치즈|소스|토핑|추가|보통|대|중|소)$/.test(s));
 let lastDish=-1;
 tokens.forEach((s,i)=>{if(dishEnding.test(s))lastDish=i;});
 let main=lastDish>=0?tokens.slice(0,lastDish+1).join(''):head.replace(/\s/g,'');
 if(alias)main=alias==='제육'?'제육볶음':alias;
 else if(generic.test(main)&&parts.length>1){
  const variant=parts.slice(1).find(s=>dishEnding.test(s.replace(/\s/g,'')));
  if(variant)main=variant.replace(/\s/g,'');
  else main=parts[1].replace(/\s/g,'')+main;
 }
 else if(!dishEnding.test(main)&&parts.length>1){
  const variant=parts.slice(1).find(s=>dishEnding.test(s.replace(/\s/g,'')));
  if(variant)main+=variant.replace(/\s/g,'');
 }
 if(/돈까스$/.test(main))main='돈까스';
 // Unknown names remain searchable; never replace them with an unrelated dish.
 main=main||clean(menu).replace(/\s/g,'')||'음식점';
 const family=families.find(([pattern])=>pattern.test(main))?.[1]??categoryQueries[category??'']??[];
 const suffix=main.match(dishEnding)?.[0];
 const broader=suffix&&suffix.length>1&&suffix!==main?[suffix]:[];
 return [...new Set([main,...family,...broader])].filter(Boolean).slice(0,3);
}
