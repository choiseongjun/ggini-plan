import {restorePantry,validPantryDate} from './pantry-inventory';
export function parseServerPantry(value:unknown){
 if(!Array.isArray(value)||value.length>100)return null;
 if(value.some(i=>!i||typeof i!=='object'||typeof i.name!=='string'||!i.name.trim()||i.name.length>50||typeof i.quantity!=='string'||i.quantity.length>40||typeof i.planned!=='boolean'||typeof i.opened!=='boolean'||(i.useSoon!==undefined&&typeof i.useSoon!=='boolean')||[i.expiresOn,i.purchasedOn].some(d=>d!==''&&!validPantryDate(d))))return null;
 const restored=restorePantry(value);return restored.length===value.length?restored:null;
}
