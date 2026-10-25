import webpush from 'web-push';
import {getPool} from './db';
import {fcmConfigured,sendFcm,invalidFcmToken} from './fcm';
import {pushConfigured} from './meal-push';
import {dueWaterTimes,parseWaterReminder,waterReminderBody} from './water-reminder';

export async function dispatchWaterReminders(){
  const db=getPool(),nativeReady=fcmConfigured(),webReady=pushConfigured();
  const now=new Date(),started=Date.now();
  let sent=0,skipped=0,failed=0;
  await db.query('DELETE FROM water_reminder_deliveries WHERE day<CURRENT_DATE-30');
  const settings=(await db.query('SELECT user_id::text,enabled,times FROM water_reminders WHERE enabled')).rows;
  for(const row of settings){
    if(Date.now()-started>35000)break;
    const parsed=parseWaterReminder(row);if(!parsed)continue;
    const due=dueWaterTimes(parsed.times,now);if(!due.times.length)continue;
    // Recheck opt-in and current totals immediately before composing each user's reminder.
    const state=(await db.query(`SELECT r.enabled,s.goal_ml,COALESCE(s.water_enabled,true) AS visible,
      COALESCE((SELECT SUM(ml) FROM wellness_water WHERE user_id=r.user_id AND day=$2::date),0)::int AS ml,
      EXISTS(SELECT 1 FROM wellness_water WHERE user_id=r.user_id AND day=$2::date AND created_at>NOW()-INTERVAL '45 minutes') AS recent
      FROM water_reminders r LEFT JOIN wellness_settings s USING(user_id) WHERE r.user_id=$1`,[row.user_id,due.day])).rows[0];
    if(!state?.enabled||!state.visible||state.recent||(state.goal_ml!==null&&state.ml>=state.goal_ml)){skipped++;continue;}
    const devices=nativeReady?(await db.query(`SELECT d.device_id,d.token FROM native_push_devices d JOIN sessions s ON s.token_hash=d.session_hash
      WHERE d.user_id=$1 AND d.enabled AND d.permission_granted AND d.token IS NOT NULL AND s.expires_at>NOW()`,[row.user_id])).rows:[];
    const browsers=webReady?(await db.query('SELECT endpoint,keys FROM push_subscriptions WHERE user_id=$1',[row.user_id])).rows:[];
    const targets=[...devices.map(d=>({id:`native:${d.device_id}`,send:()=>sendFcm(d.token,'물 마신 양을 확인해 볼까요?',waterReminderBody(state.ml,state.goal_ml),'/?from=water#water-tracker','water-reminder'),invalid:()=>db.query('UPDATE native_push_devices SET token=NULL,permission_granted=FALSE WHERE device_id=$1 AND token=$2',[d.device_id,d.token])})),...browsers.map(b=>({id:`web:${b.endpoint}`,send:()=>webpush.sendNotification(b,JSON.stringify({title:'물 마신 양을 확인해 볼까요?',body:waterReminderBody(state.ml,state.goal_ml),url:'/?from=water#water-tracker',tag:'water-reminder'}),{TTL:1800}),invalid:()=>db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2',[b.endpoint,row.user_id])}))];
    for(const time of due.times)for(const target of targets){
      const claimed=await db.query('INSERT INTO water_reminder_deliveries(user_id,destination,day,time) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING user_id',[row.user_id,target.id,due.day,time]);
      if(!claimed.rowCount)continue;
      try{await target.send();sent++;}catch(error){
        failed++;
        if(invalidFcmToken(error)||[404,410].includes((error as {statusCode:number}).statusCode))await target.invalid();
        else await db.query('DELETE FROM water_reminder_deliveries WHERE user_id=$1 AND destination=$2 AND day=$3 AND time=$4',[row.user_id,target.id,due.day,time]);
      }
    }
  }
  return {sent,skipped,failed};
}
