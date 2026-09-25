import fs from 'node:fs';
type Entry={originalName:string;name:string;action:string;reason:string;ingredients:{name:string;grams:number}[];model:string};
const path='data/menu-quality-review.json';
const results:Record<string,Entry>=JSON.parse(fs.readFileSync(path,'utf8'));
const adjustments:Record<string,Entry>=JSON.parse(fs.readFileSync('data/menu-quality-adjustments.json','utf8'));
const source:{id:string;source:string}[]=JSON.parse(fs.readFileSync('.cache/menu-review/source.json','utf8'));
const roles:Record<string,string>=JSON.parse(fs.readFileSync('data/dish-roles.json','utf8'));
// Recompute duplicate groups on reruns and prefer a meal over a side/non-meal variant.
for(const row of Object.values(results))if(row.reason.startsWith('같은 이름의 메뉴 중복')){row.action=row.name===row.originalName?'keep':'rename';row.reason='메뉴 이름 정리';}
for(const [id,change] of Object.entries(adjustments)) {
 const old=results[id];if(!old||old.originalName!==change.originalName||JSON.stringify(old.ingredients)!==JSON.stringify(change.ingredients))throw Error(`Stale manual review ${id}`);
 results[id]=change;
}
const priority:Record<string,number>={optimizer:0,'gov-expansion':1,'ai-expansion':2};
const sources=new Map(source.map(r=>[r.id,priority[r.source]??3]));
const canonical=new Map<string,string>();
const rolePriority=(id:string)=>['main','one-bowl','soup'].includes(roles[id])?0:roles[id]==='side'?1:2;
for(const[id,row]of Object.entries(results).sort(([a],[b])=>rolePriority(a)-rolePriority(b)||(sources.get(a)??3)-(sources.get(b)??3)||a.localeCompare(b))){
 if(row.action==='hold')continue;
 // Never erase dietary variants while polishing names or collapse them into regular recipes.
 const protectedTerms=['소금제외','저염','무염','설탕제외','무가당','저당','글루텐프리','채식','비건'];
 if(row.action==='rename'&&protectedTerms.some(term=>row.originalName.includes(term)&&!row.name.includes(term))){row.name=row.originalName;row.action='keep';row.reason='';}
 if(row.name===row.originalName&&row.action==='rename'){row.action='keep';row.reason='';}
 const key=row.name.normalize('NFKC').replace(/[\s_·]/g,'');
 const previous=canonical.get(key);
 if(previous){row.action='hold';row.reason=`같은 이름의 메뉴 중복 · ${results[previous].name} (${previous})로 통합`;}
 else canonical.set(key,id);
}
fs.writeFileSync(path,JSON.stringify(results,null,1)+'\n');
fs.mkdirSync('artifacts/menu-review',{recursive:true});
const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
fs.writeFileSync('artifacts/menu-review/results.csv','\ufeff'+[['코드','원래 이름','표시 이름','판정','이유'],...Object.entries(results).map(([id,r])=>[id,r.originalName,r.name,r.action,r.reason])].map(row=>row.map(quote).join(',')).join('\n'));
const counts:Record<string,number>={};for(const r of Object.values(results))counts[r.action]=(counts[r.action]??0)+1;console.log(counts);
