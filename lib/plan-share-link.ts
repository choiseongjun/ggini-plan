/** Shared snapshots use the production database and must open outside the sender's device. */
export function publicPlanShareUrl(path: unknown): string {
 if(typeof path!=='string'||!/^\/share\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path))throw new Error('공유 주소를 확인하지 못했어요. 다시 시도해 주세요.');
 return new URL(path,'https://gginiplan.kr').href;
}
