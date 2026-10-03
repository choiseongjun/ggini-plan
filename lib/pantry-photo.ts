import {canonicalIngredient} from './ingredient-canonical';

export const photoSources = ['ingredients','cart','receipt'] as const;
export type PhotoSource = typeof photoSources[number];
export type PhotoIngredient = {name:string; category:string; uncertain:boolean};
export function parsePantryPhoto(value:unknown): {items:PhotoIngredient[]; note:string; source:PhotoSource|'unknown'} {
  if(!value || typeof value!=='object') throw new Error('사진 분석 결과를 확인하지 못했어요.');
  const data=value as Record<string,unknown>;
  if(![...photoSources,'unknown'].includes(data.source as PhotoSource)) throw new Error('사진 종류를 확인하지 못했어요.');
  if(!Array.isArray(data.items)||data.items.length>60||typeof data.note!=='string') throw new Error('사진 분석 결과를 확인하지 못했어요.');
  const items:PhotoIngredient[]=[];
  for(const item of data.items){
    if(!item||typeof item!=='object'||typeof item.name!=='string'||item.name.length>50||typeof item.category!=='string'||!['채소·과일','육류·생선','달걀·유제품','곡류·면','양념','기타'].includes(item.category)||typeof item.uncertain!=='boolean') throw new Error('사진 분석 결과를 확인하지 못했어요.');
    const name=canonicalIngredient(item.name);
    if(name&&!items.some(i=>i.name===name)) items.push({name,category:item.category,uncertain:item.uncertain});
  }
  return {items,note:data.note.slice(0,500),source:data.source as PhotoSource|'unknown'};
}
