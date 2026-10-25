export type DinnerBattle = {
 id:string; menuA:string; menuB:string; expiresAt:string; closed:boolean; mine:boolean;
 votes:[number,number]; voted:number|null; eatenChoice:number|null; caption:string|null; hasPhoto:boolean;
};
export function parseBattleMenus(value:unknown):[string,string]|null {
 if(!value || typeof value!=='object')return null;
 const {menuA,menuB}=value as Record<string,unknown>;
 const clean=(s:unknown)=>typeof s==='string'?s.normalize('NFC').trim().replace(/\s+/g,' '):'';
 const a=clean(menuA),b=clean(menuB);
 return a&&b&&a.length<=40&&b.length<=40&&a.toLocaleLowerCase()!==b.toLocaleLowerCase()?[a,b]:null;
}
export const validBattleId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function battleResult(votes:[number,number]) {
 const total=votes[0]+votes[1];
 return total===0?'첫 표를 기다리고 있어요':votes[0]===votes[1]?'지금은 동점이에요':`${votes[0]>votes[1]?'첫 번째':'두 번째'} 메뉴가 앞서고 있어요`;
}
