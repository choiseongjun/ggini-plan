import {getPool} from '../lib/db';
import {photoAnalysisPolicy} from '../lib/photo-analysis-policy';
async function main(){
 const pool=getPool();
 try{
  const r=await pool.query(`SELECT count(*)::int AS month_requests,
   count(*) FILTER (WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')::int AS today_requests
   FROM photo_analysis_requests WHERE created_at>=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'`);
  const reserve=Number(process.env.PHOTO_ANALYSIS_RESERVED_COST_KRW);
  console.log(JSON.stringify({timezone:'Asia/Seoul',limits:photoAnalysisPolicy(),...r.rows[0],estimated_reserved_krw:reserve>0?r.rows[0].month_requests*reserve:null,note:'Reservations include failures. This is not a provider invoice; token usage is in photo_analysis_usage server logs.'},null,2));
 }finally{await pool.end();}
}
main().catch(()=>{console.error('분석 사용량을 조회하지 못했습니다. DB 연결과 스키마를 확인하세요.');process.exitCode=1;});
