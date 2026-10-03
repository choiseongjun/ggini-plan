import {canonicalIngredient} from './ingredient-canonical';
export type PantryItem={id:string;name:string;quantity:string;expiresOn:string;purchasedOn:string;opened:boolean;planned:boolean;useSoon?:boolean};
export function parsePantryEntry(text:string){
 return text.split(/[,，\n;]+/).slice(0,30).flatMap(part=>{
  const clean=part.trim().replace(/^남은\s*/, '');
  const match=clean.match(/\s*((?:\d+(?:\.\d+)?\s*(?:kg|g|ml|l|개|모|봉|팩|장|병|단)|반\s*모|반\s*개|조금|한\s*봉|한\s*팩))\s*$/i);
  const quantity=match?.[1].trim()??'';
  const name=canonicalIngredient(match?clean.slice(0,match.index):clean);
  return name&&name.length<=50?[{name,quantity}]:[];
 });
}
export function validPantryDate(value:unknown):string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';
 const date=new Date(`${value}T00:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:'';
}
export function pantryToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function restorePantry(value:unknown):PantryItem[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,100).flatMap((item,index)=>{
  if(!item||typeof item!=='object'||typeof item.name!=='string')return [];
  const name=canonicalIngredient(item.name.slice(0,50));if(!name)return [];
  return [{id:`restored-${index}`,name,quantity:typeof item.quantity==='string'?item.quantity.slice(0,40):'',expiresOn:validPantryDate(item.expiresOn),purchasedOn:validPantryDate(item.purchasedOn),opened:item.opened===true,planned:item.planned===true,useSoon:item.useSoon===true}];
 });
}
export function pantryForRecommendation(items:PantryItem[],today=pantryToday()){
 const usable=items.filter(i=>!i.planned&&(!i.expiresOn||i.expiresOn>=today));
 const urgent=usable.filter(i=>i.expiresOn).sort((a,b)=>a.expiresOn.localeCompare(b.expiresOn));
 return {owned:[...new Set(usable.map(i=>i.name))],priority:[...new Set([...usable.filter(i=>i.useSoon).map(i=>i.name),...urgent.map(i=>i.name)])]};
}

// Merge repeated inputs without losing lot details or treating planned purchases as owned.
export function mergePantryEntries(inventory:PantryItem[], entries:{name:string;quantity?:string}[], planned=false, today=pantryToday()):PantryItem[]{
 const next=inventory.map(item=>({...item}));
 for(const entry of entries){
  const name=canonicalIngredient(entry.name);if(!name||name.length>50)continue;
  const existing=next.find(item=>item.name===name&&item.planned===planned&&(!item.expiresOn||item.expiresOn>=today));
  if(existing){if(entry.quantity)existing.quantity=entry.quantity;continue;}
  if(next.length>=100)break;
  next.push({id:crypto.randomUUID(),name,quantity:entry.quantity??'',expiresOn:'',purchasedOn:'',opened:false,planned,useSoon:false});
 }
 return next;
}
