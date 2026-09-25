import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getMessaging} from 'firebase-admin/messaging';

export function fcmConfigured(){return Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON?.trim());}
export function fcmMessaging(){
 const existing=getApps().find(app=>app.name==='ggini-fcm');
 if(existing)return getMessaging(existing);
 const raw=process.env.FCM_SERVICE_ACCOUNT_JSON;
 if(!raw)throw new Error('FCM is not configured');
 const service=JSON.parse(raw);
 if(service.project_id!==process.env.FIREBASE_PROJECT_ID)throw new Error('FCM project mismatch');
 return getMessaging(initializeApp({credential:cert(service),projectId:service.project_id},'ggini-fcm'));
}
export async function sendFcm(token:string,title:string,body:string,url:string,tag:string,dryRun=false){
 // Expo Android maps data.body JSON into notification.request.content.data.
 return fcmMessaging().send({token,notification:{title,body},data:{url,body:JSON.stringify({url})},android:{priority:'normal',ttl:3600000,collapseKey:tag,notification:{channelId:'meal-reminders',tag,color:'#234b36',sound:'default'}}},dryRun);
}
export function invalidFcmToken(error:unknown){return ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(String((error as {code?:string})?.code));}
