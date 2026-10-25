import {getPool} from './db';
import {photoAnalysisPolicy} from './photo-analysis-policy';
// Persisted and serialized across serverless instances. Failed provider calls also consume a slot.
export async function reservePhotoAnalysis(userId:string){
 const client=await getPool().connect();
 try{
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(72638103)");
  await client.query("DELETE FROM photo_analysis_requests WHERE created_at<now()-interval '62 days'");
  const result=await client.query(`SELECT count(*) FILTER (WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')::int AS total,
   count(*) FILTER (WHERE user_id=$1 AND created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')::int AS personal,
   count(*) FILTER (WHERE created_at>=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')::int AS monthly,
   count(*) FILTER (WHERE created_at>now()-interval '1 minute')::int AS recent
   FROM photo_analysis_requests WHERE created_at>=LEAST(date_trunc('month',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul',now()-interval '1 minute')`,[userId]);
  const {total,personal,recent,monthly}=result.rows[0],policy=photoAnalysisPolicy();
  const error=personal>=policy.personal?`오늘 무료 사진 분석 ${policy.personal}회를 모두 사용했어요. 음식 이름으로 기록해 주세요.`:monthly>=policy.monthly?'이번 달 서비스의 분석 한도를 모두 사용했어요. 최근 식사를 다시 기록하거나 음식 이름으로 기록해 주세요.':total>=policy.daily?'오늘 서비스의 무료 분석 한도를 모두 사용했어요. 음식 이름으로 기록해 주세요.':recent>=policy.minute?'사진 분석 요청이 몰렸어요. 1분 뒤 다시 시도해 주세요.':null;
  if(!error)await client.query('INSERT INTO photo_analysis_requests(user_id) VALUES($1)',[userId]);
  await client.query('COMMIT');return error;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
