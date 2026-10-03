import type {PlanProduct} from './shopping-plan';
import type {RecipeVideo} from './youtube-recipes';
import {canonicalIngredient} from './ingredient-canonical';

export type SourceRecipe={video:RecipeVideo;ingredients:{name:string;label:string;optional?:boolean}[];steps:string[];tips:string[];servingLabel:string};

export function withSourceRecipe(base:Pick<PlanProduct,'name'|'emoji'> & {family:string},source:SourceRecipe):PlanProduct{
 // These are recipe quantities, not priced retail products or inferred nutrients.
 const blank:PlanProduct={id:'',name:'',emoji:'',detail:'출처 레시피 재료',price:0,portions:'',protein:'미확인',color:'',searchQuery:'',unit:'개',quantity:1,category:'ingredient',inWeeklyCart:false,productImageUrl:null,productUrl:null,nutritionSourceName:null,nutritionSourceUrl:null,nutritionPhotoUrl:null,nutritionBasis:null,caloriesKcal:null,proteinG:null,carbohydratesG:null,fatG:null,sodiumMg:null,updatedAt:null,servings:1,servingNote:'원문 분량',avoidanceText:null};
 return {...blank,id:`source-${source.video.id}`,name:base.name.replaceAll('_',' '),emoji:base.emoji,category:'other',detail:`${source.video.channel}의 영상 설명란 기준`,sourceRecipe:source,avoidanceText:source.ingredients.map(i=>i.name).join(' '),
  recipe:{minutes:null,slots:['lunch','dinner'],family:base.family,steps:source.steps,nutrition:{calories:null,protein:null},ingredients:source.ingredients.map((i,index)=>({product:{...blank,id:`source-${source.video.id}-${index}`,name:canonicalIngredient(i.name)||i.name},label:i.label,packs:1}))}};
}
