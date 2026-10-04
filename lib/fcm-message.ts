import type {Message} from 'firebase-admin/messaging';

export function fcmMessage(token:string,title:string,body:string,url:string,tag:string,now=Date.now()):Message{
 // Expo Android maps data.body JSON into notification.request.content.data.
 return {token,notification:{title,body},data:{url,body:JSON.stringify({url})},
  // A lunch reminder must not arrive at dinner after the phone was offline: expire with Android's 1-hour TTL.
  apns:{headers:{'apns-push-type':'alert','apns-priority':'10','apns-collapse-id':tag,'apns-expiration':String(Math.floor(now/1000)+3600)},payload:{aps:{sound:'default',threadId:'meal-reminders'}}},
  android:{priority:'normal',ttl:3600000,collapseKey:tag,notification:{channelId:'meal-reminders',tag,color:'#234b36',sound:'default'}}};
}
