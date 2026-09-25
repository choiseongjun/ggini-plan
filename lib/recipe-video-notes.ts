// Extract only published recipe text. Never invent steps from a title or a different recipe.
export type RecipeVideoNotes={ingredients:string[];steps:string[];tips:string[]};
export function recipeVideoNotes(description:string):RecipeVideoNotes{
 const result:RecipeVideoNotes={ingredients:[],steps:[],tips:[]};
 let section:keyof RecipeVideoNotes|null=null;
 for(const raw of description.slice(0,12000).split(/\r?\n/)){
  const line=raw.trim().replace(/^[#*•·▶▷✅🥣🍳\s]+/u,'').trim();
  if(!line)continue;
  if(/https?:\/\/|www\.|@|구독|좋아요|협찬|광고|비즈니스|문의|멤버십|가입|사용제품|사용 제품|이벤트|copyright|subscribe|instagram/i.test(line)){section=null;continue;}
  const heading=line.replace(/^\[([^\]]+)\]$/,'$1').replace(/^【([^】]+)】$/,'$1').trim();
  let next:keyof RecipeVideoNotes|null=null;
  if(/^(?:주\s*재료|부\s*재료|재료|양념(?:장)?|소스|ingredients)(?:\s|[:：\[\](（]|$)/i.test(heading))next='ingredients';
  else if(/^(?:만드는\s*(?:법|방법)|조리\s*(?:법|방법|순서)|만들기|레시피|조리과정|directions|instructions|method)(?:\s|[:：\[\](（]|$)/i.test(heading))next='steps';
  else if(/^(?:요리\s*팁|조리\s*팁|팁|주의사항|tips)(?:\s|[:：]|$)/i.test(heading))next='tips';
  if(next){section=next;const content=heading.split(/[:：]/).slice(1).join(':').trim();if(content)result[next].push(content);else if(next==='ingredients'&&/\d.*인분/.test(heading))result.ingredients.push(heading);continue;}
  const numbered=/^\d{1,2}[.)]\s+/.test(line);
  const action=/(?:넣|썰|볶|끓|굽|구워|익혀|익히|섞|씻|데치|데쳐|담|무쳐|버무|준비|손질|불려|재워|찐|쪄|저어|풀어)/.test(line);
  if(numbered&&action)section='steps';
  // Unknown headings end the section, so newsletter and promotional text cannot become ingredients.
  if(/^[\[【]/.test(line)&&!next){section=null;continue;}
  if(!section)continue;
  if(section==='steps'&&!action&&!numbered)continue;
  if(section==='ingredients'&&!/[\d¼½¾]|약간|적당|기호|취향|소량/.test(line)&&(line.length>60||/[.!?。]|감사|응원/.test(line)))continue;
  const clean=line.replace(/^\d{1,2}[.)]\s+/,'').replace(/^[-–]\s*/,'').trim();
  if(clean.length>0&&clean.length<=500&&!result[section].includes(clean))result[section].push(clean);
 }
 return {ingredients:result.ingredients.slice(0,24),steps:result.steps.slice(0,16),tips:result.tips.slice(0,6)};
}
