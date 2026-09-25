import {getPool} from './db';
import {dueNativeSlots,parseNativeTimes,type MealTimes} from './native-push-input';
import {fcmConfigured,sendFcm,invalidFcmToken} from './fcm';
import {todaysMenu} from './meal-push';
import {planProducts} from './shopping-plan-catalog';
import {slotLabels} from './shopping-plan';
import {claimNativeDelivery} from './native-push-claim';
type Device={device_id:string;user_id:string;token:string;times:MealTimes};
export async function dispatchNativeMealReminders(){
 if(!fcmConfigured())return {sent:0,skipped:0,failed:0,error:'FCM not configured'};
 const db=getPool();
 await db.query("DELETE FROM native_push_deliveries WHERE day<CURRENT_DATE-30");
 await db.query("DELETE FROM native_push_devices WHERE updated_at<NOW()-INTERVAL '90 days'");
 const devices=(await db.query<Device>(`SELECT d.device_id,d.user_id::text,d.token,d.times FROM native_push_devices d JOIN sessions s ON s.token_hash=d.session_hash
  WHERE d.enabled AND d.permission_granted AND d.token IS NOT NULL AND s.expires_at>NOW() ORDER BY d.device_id`)).rows;
 const due=devices.flatMap(device=>dueNativeSlots(parseNativeTimes(device.times)??{}).map(item=>({...item,device})));
 if(!due.length)return {sent:0,skipped:0,failed:0};
 const ids=[...new Set(due.map(d=>d.device.user_id))];
 const [plans,recent,products]=await Promise.all([
  db.query('SELECT DISTINCT ON(user_id) user_id::text,conditions,meal_ids AS "mealIds" FROM shopping_plans WHERE user_id=ANY($1::bigint[]) ORDER BY user_id,id DESC',[ids]),
  db.query("SELECT DISTINCT user_id::text FROM food_intake_logs WHERE user_id=ANY($1::bigint[]) AND undone_at IS NULL AND created_at>NOW()-INTERVAL '2 hours' AND product_id NOT LIKE 'ref:%' AND product_id NOT LIKE 'extra:%'",[ids]),
  planProducts(),
 ]);
 const byUser=new Map(plans.rows.map(p=>[p.user_id,p])),ate=new Set(recent.rows.map(r=>r.user_id));
 let sent=0,skipped=0,failed=0;
 const started=Date.now();
 for(const {device,slot,day} of due){
  if(Date.now()-started>40000)break; // Leave remaining devices for the next scheduler run.
  if(!await claimNativeDelivery(device.device_id,day,slot))continue;
  const finish=(state:string)=>db.query('UPDATE native_push_deliveries SET state=$4,updated_at=NOW() WHERE device_id=$1 AND day=$2 AND slot=$3',[device.device_id,day,slot,state]);
  const active=(await db.query(`SELECT 1 FROM native_push_devices d JOIN sessions s ON d.session_hash=s.token_hash
   WHERE d.device_id=$1 AND d.user_id=$2 AND d.token=$3 AND d.enabled AND d.permission_granted AND s.expires_at>NOW()`,[device.device_id,device.user_id,device.token])).rowCount;
  if(!active||ate.has(device.user_id)){skipped++;await finish('skipped');continue;}
  const menu=todaysMenu(byUser.get(device.user_id),slot,day,products);
  try{
   await sendFcm(device.token,menu?`오늘 ${slotLabels[slot]}은 ${menu.name}`:`${slotLabels[slot]} 챙길 시간이에요`,menu?'식사를 마쳤다면 끼니플랜에 기록해 주세요.':'끼니플랜에서 오늘 먹을 메뉴를 골라 보세요.',menu?'/record?from=push':'/?from=push',`meal-${slot}`);
  }catch(error){
   failed++;
   if(invalidFcmToken(error)){
    await db.query('UPDATE native_push_devices SET token=NULL,permission_granted=FALSE WHERE device_id=$1 AND token=$2',[device.device_id,device.token]);
    await finish('skipped');
   }else await finish('failed');
   continue;
  }
  sent++;await finish('sent');
 }
 return {sent,skipped,failed};
}
