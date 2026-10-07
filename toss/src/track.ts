import {Analytics} from '@apps-in-toss/web-framework';

// 토스 콘솔 분석 로그. 익명 키는 SDK가 붙이고, 여기서는 행동 이름과 메뉴·상품 ID, 개수만 보낸다(신체 정보·자유 입력 없음).
type Params=Record<string,string|number|boolean|undefined>;
const send=(call:()=>Promise<void>|undefined)=>{try{void call()?.catch(()=>{});}catch{/* 분석 실패는 사용 흐름을 막지 않는다. */}};

export const track={
 screen:(name:string,params:Params={})=>import.meta.env.DEV?console.debug('[track] screen',name,params):send(()=>Analytics.screen({log_name:name,...params})),
 click:(name:string,params:Params={})=>import.meta.env.DEV?console.debug('[track] click',name,params):send(()=>Analytics.click({log_name:name,...params})),
 event:(name:string,params:Params={})=>import.meta.env.DEV?console.debug('[track] event',name,params):send(()=>Analytics.log({log_name:name,log_type:'event',params})),
};
