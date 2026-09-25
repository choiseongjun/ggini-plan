export type RestaurantContent={images:{title:string;url:string}[];blogs:{title:string;url:string;description:string;author:string}[];partial:boolean};
const text=(v:unknown)=>typeof v==='string'?v.replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').slice(0,500):'';
function url(v:unknown){try{const u=new URL(String(v));return u.protocol==='https:'?u.href:'';}catch{return '';}}
export function parseRestaurantContent(imageData:unknown,blogData:unknown,name=''):RestaurantContent{
 const items=(v:unknown):Record<string,unknown>[]=>v&&typeof v==='object'&&'items' in v&&Array.isArray(v.items)?v.items.filter(x=>x&&typeof x==='object'):[];
 const normalize=(v:string)=>v.toLowerCase().replace(/cafe|카페/g,'').replace(/[^가-힣a-z0-9]/g,'');
 const tokens=name.replace(/cafe/gi,'').split(/[\s&]+/).map(normalize).filter(Boolean);
 const matches=(value:string)=>tokens.every(token=>normalize(value).includes(token));
 return {images:items(imageData).map(x=>({title:text(x.title),url:url(x.thumbnail)})).filter(x=>x.url&&matches(x.title)).slice(0,4),blogs:items(blogData).map(x=>({title:text(x.title),url:url(x.link),description:text(x.description),author:text(x.bloggername)})).filter(x=>x.url&&x.title&&matches(x.title+' '+x.description)).slice(0,3),partial:imageData===null||blogData===null};
}
