import {validPlanDate} from './daily-plan';
export type ShoppingExpense={id:string;date:string;amount:number;action:'buy'|'order'|'backfill';itemIds:string[]};
export function parseShoppingExpense(value:unknown):ShoppingExpense|null{
 if(!value||typeof value!=='object')return null;
 const p=value as ShoppingExpense;
 if(typeof p.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||!validPlanDate(p.date)||!Number.isSafeInteger(p.amount)||p.amount<0||p.amount>10000000||!['buy','order','backfill'].includes(p.action)||!Array.isArray(p.itemIds)||!p.itemIds.length||p.itemIds.length>300||p.itemIds.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))||new Set(p.itemIds).size!==p.itemIds.length)return null;
 return {id:p.id,date:p.date,amount:p.amount,action:p.action,itemIds:p.itemIds};
}
