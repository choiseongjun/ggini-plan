import {stockPrecision,validStockQuantity} from './food-intake';
import {validStockId} from './stock-id';
export type StockItem = {id:string;name:string;unit:string;url:string|null;ordered:number;owned:number};
export type ShoppingStock = Record<string,StockItem>;
export type StockAction = 'order'|'buy'|'receive'|'cancel'|'consume'|'have';
export type StockChange = {item:Omit<StockItem,'ordered'|'owned'>;quantity:number};
export function parseStock(value:unknown):ShoppingStock|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const entries=Object.entries(value);if(entries.length>300)return null;
 const result:ShoppingStock={};
 for(const [id,v] of entries){
  if(!validStockId(id)||!v||typeof v!=='object')return null;
  const p=v as StockItem;
  if(p.id!==id||typeof p.name!=='string'||!p.name.trim()||p.name.length>200||typeof p.unit!=='string'||p.unit.length>20||!p.unit)return null;
  if(p.url!==null){try{if(typeof p.url!=='string'||p.url.length>3000||!['https:','http:'].includes(new URL(p.url).protocol))return null;}catch{return null;}}
  if(![p.ordered,p.owned].every(validStockQuantity))return null;
  result[id]={id,name:p.name,unit:p.unit,url:p.url,ordered:p.ordered,owned:p.owned};
 }
 return result;
}
export function changeStock(stock:ShoppingStock,changes:StockChange[],action:StockAction):ShoppingStock {
 const next={...stock};
 for(const {item,quantity:q} of changes){
  if(!validStockQuantity(q)||q<=0)throw new Error('수량을 확인해 주세요.');
  const prev=next[item.id];
  if(prev&&prev.unit!==item.unit)throw new Error('상품 단위가 바뀌었어요. 보유 수량을 확인해 주세요.');
  const row={...item,ordered:prev?.ordered??0,owned:prev?.owned??0};
  if(action==='order')row.ordered+=q;
  if(action==='buy')row.owned+=q;
  if(action==='have')row.owned+=q;
  if(action==='receive'||action==='cancel'){
   if(q>row.ordered)throw new Error('주문 수량이 바뀌었어요. 다시 확인해 주세요.');
   row.ordered-=q;if(action==='receive')row.owned+=q;
  }
  if(action==='consume'){if(q>row.owned)throw new Error('보유 수량을 확인해 주세요.');row.owned-=q;}
  row.ordered=stockPrecision(row.ordered);row.owned=stockPrecision(row.owned);
  next[item.id]=row;
 }
 const parsed=parseStock(next);if(!parsed)throw new Error('저장할 수 있는 수량을 초과했어요.');return parsed;
}
export const remainingQuantity=(required:number,item?:StockItem)=>Math.max(0,stockPrecision(required-(item?.owned??0)-(item?.ordered??0)));
