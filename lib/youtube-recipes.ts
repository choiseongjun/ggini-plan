export type RecipeVideo={id:string;title:string;channel:string;url:string;thumbnail:string};
export function parseRecipeVideos(data:unknown,limit=3):RecipeVideo[]{
 if(!data||typeof data!=='object'||!('items' in data)||!Array.isArray(data.items))return [];
 return data.items.flatMap(item=>{
  const id=item?.id?.videoId,s=item?.snippet;
  if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{11}$/.test(id)||typeof s?.title!=='string'||typeof s?.channelTitle!=='string')return [];
  return [{id,title:s.title,channel:s.channelTitle,url:`https://www.youtube.com/watch?v=${id}`,thumbnail:`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}];
 }).slice(0,limit);
}
export function relevantRecipeVideos(videos:RecipeVideo[],name:string){
 const primary=/닭/.test(name)?/닭|치킨|chicken/i:/삼겹살/.test(name)?/삼겹|pork belly/i:/돼지/.test(name)?/돼지|제육|돈불고기|pork/i:/소불고기|소고기/.test(name)?/소불고기|소고기|불고기|beef/i:/생선/.test(name)?/생선|고등어|삼치|연어|fish/i:/두부/.test(name)?/두부|tofu/i:/달걀/.test(name)?/달걀|계란|에그|egg/i:null;
 // A shared ingredient alone does not make a video a guide to this dish.
 const methods:[RegExp,RegExp][]=[
  [/찜/,/찜|쪄|찌기|steamed?/i],[/죽/,/죽|porridge/i],
  [/볶음/,/볶음|볶기|볶는|stir.?fr/i],[/구이/,/구이|굽기|굽는|grill|roast/i],
  [/부침/,/부침|부치기|전 만들기|전만들기|pancake/i],
  [/덮밥/,/덮밥|rice bowl/i],[/불고기/,/불고기|bulgogi/i],
 ];
 const ingredients:[RegExp,RegExp][]=[
  [/버섯/,/버섯|mushroom/i],[/양배추/,/양배추|cabbage/i],
  [/감자/,/감자|potato/i],[/애호박/,/애호박|zucchini/i],
  [/달걀/,/달걀|계란|에그|egg/i],[/두부/,/두부|tofu/i],
 ];
 const required=[...methods,...ingredients].filter(([menu])=>menu.test(name)).map(([,title])=>title);
 return videos.filter(v=>(!primary||primary.test(v.title))&&required.every(pattern=>pattern.test(v.title))).slice(0,3);
}
