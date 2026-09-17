import {availablePortions,consumeFood,restoreConsumption,servingNutrition,type IntakeData,type IntakeLog} from './food-intake';
import type {PlanProduct} from './shopping-plan';
import type {ShoppingStock} from './shopping-progress';
export const taiwanStockKey='kkiniplan-progress-products-guest-TW';
type StoredLog=IntakeLog&{snapshot:ReturnType<typeof consumeFood>['snapshot'];undone?:boolean;date:string};
type Store={stock:ShoppingStock;version:number;logs?:StoredLog[]};
const read=():Store=>JSON.parse(localStorage.getItem(taiwanStockKey)??'{"stock":{},"version":0}');
export function taiwanIntakeData(products:PlanProduct[],date:string):IntakeData{
 const data=read();
 return {date,version:data.version,logs:(data.logs??[]).filter(l=>l.date===date&&!l.undone),products:products.flatMap(p=>{const available=availablePortions(data.stock,p);return available>0?[{id:p.id,name:p.name,servings:p.servings,servingNote:p.servingNote,available,image:p.productImageUrl,...servingNutrition(p)}]:[];})};
}
export async function withTaiwanStockLock<T>(fn:()=>T|Promise<T>):Promise<T>{return navigator.locks?navigator.locks.request('kkiniplan-TW-stock',fn):fn();}
export async function updateTaiwanIntake(command:{action:'eat'|'undo';id:string;version:number;productId?:string;portions?:number},products:PlanProduct[],date:string){
 const update=()=>{
  const data=read(),logs=data.logs??[],old=logs.find(l=>l.id===command.id);
  if(command.action==='eat'&&old||command.action==='undo'&&old?.undone)return;
  if(data.version!==command.version)throw new Error('其他畫面已更新庫存，請重新載入。');
  if(command.action==='eat'){
   const p=products.find(p=>p.id===command.productId);if(!p)throw new Error('找不到商品，請重新載入。');
   const portions=command.portions??1;
   const consumed=consumeFood(data.stock,p,portions);data.stock=consumed.stock;
   logs.push({id:command.id,productId:p.id,name:p.name,date,portions,packs:consumed.packs,calories:consumed.calories,protein:consumed.protein,cost:Math.round(p.price/p.servings*portions),createdAt:new Date().toISOString(),snapshot:consumed.snapshot});
  }else{
   if(!old)throw new Error('找不到這筆紀錄。');
   data.stock=restoreConsumption(data.stock,old.snapshot,old.packs);old.undone=true;
  }
  localStorage.setItem(taiwanStockKey,JSON.stringify({...data,version:data.version+1,logs}));
 };
 await withTaiwanStockLock(update);
}
