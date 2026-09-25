import {getPool} from './db';
export async function claimNativeDelivery(deviceId:string,day:string,slot:string){
 const claim=await getPool().query(`INSERT INTO native_push_deliveries(device_id,day,slot,state) VALUES($1,$2,$3,'sending')
  ON CONFLICT(device_id,day,slot) DO UPDATE SET state='sending',attempts=native_push_deliveries.attempts+1,updated_at=NOW()
  WHERE native_push_deliveries.state='failed' AND native_push_deliveries.attempts<3 AND native_push_deliveries.updated_at<NOW()-INTERVAL '5 minutes'
  RETURNING device_id`,[deviceId,day,slot]);
 return Boolean(claim.rowCount);
}
