export const serviceFeedbackKinds={useful:'도움됐어요',difficult:'불편했어요',idea:'제안 있어요'} as const;
export const recommendationFeedbackKinds={recommend_good:'괜찮아요',recommend_expensive:'너무 비싸요',recommend_taste:'취향이 아니에요',recommend_repetitive:'메뉴가 반복돼요'} as const;
export const feedbackKinds={...serviceFeedbackKinds,...recommendationFeedbackKinds} as const;
export function parseFeedback(value:unknown){
 if(!value||typeof value!=='object')return null;
 const p=value as Record<string,unknown>;
 if(typeof p.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)||typeof p.kind!=='string'||!Object.hasOwn(feedbackKinds,p.kind)||typeof p.message!=='string'||p.message.length>1000||typeof p.page!=='string'||!/^\/[a-z0-9/_-]{0,99}$/i.test(p.page))return null;
 return {id:p.id,kind:p.kind as keyof typeof feedbackKinds,message:p.message.trim(),page:p.page};
}
