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
 return videos.filter(v=>(!primary||primary.test(v.title))&&(!/죽/.test(name)||/죽|porridge/i.test(v.title))).slice(0,3);
}
