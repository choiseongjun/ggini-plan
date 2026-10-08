import recipes from '../data/home-video-recipes.json';
import {withSourceRecipe} from './source-recipe';

// Editorial picks verified on checkedAt; never a popularity ranking.
export function homeVideoPicks(){
  return recipes.map(source=>({product:withSourceRecipe({name:source.name,emoji:'🍳',family:source.family},source),reason:source.reason,video:source.video,publishedAt:source.publishedAt,channelId:source.channelId}));
}
