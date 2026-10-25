export type AppLanguage='ko'|'en'|'ja';
export function appLanguage(path:string):AppLanguage{return path==='/en'||path.startsWith('/en/')?'en':path==='/ja'||path.startsWith('/ja/')?'ja':'ko';}
export function withoutLanguage(path:string){return path.replace(/^\/(en|ja)(?=\/|$)/,'')||'/';}
export const localizedRoutes=new Set(['/','/record','/stats','/profile','/ingredients','/next-meal']);
export function languagePath(path:string,language:AppLanguage){
 if(!path.startsWith('/')||path.startsWith('//'))return path;
 const base=withoutLanguage(path),route=base.split(/[?#]/)[0];
 return localizedRoutes.has(route)?(language==='ko'?'':`/${language}`)+(base==='/'?(language==='ko'?'/':''):base):path;
}
