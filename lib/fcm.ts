import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getMessaging} from 'firebase-admin/messaging';
import {fcmMessage} from './fcm-message';

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
 return fcmMessaging().send(fcmMessage(token,title,body,url,tag),dryRun);
}
export function invalidFcmToken(error:unknown){return ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(String((error as {code?:string})?.code));}
