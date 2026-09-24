import {getPool} from './db';
import {planDate} from './daily-plan';
import {mealSchedule, type PlanConditions} from './shopping-plan';

// 추천 결과를 남긴다(로그인 사용자만). 실패해도 추천 응답은 막지 않는다.
export async function logRecommendations(userId: string, c: PlanConditions, ids: string[], kind: 'recommend' | 'swap', only?: number) {
 try {
  const schedule = mealSchedule(c), start = c.startDate;
  if (!start) return;
  const rows = ids.flatMap((id, i) => (only === undefined || only === i) && id && schedule[i] ? [[id, schedule[i].slot, planDate(start, schedule[i].day)]] : []);
  if (!rows.length) return;
  const values = rows.map((_, i) => `($1,$${i * 3 + 3},$${i * 3 + 4},$${i * 3 + 5},$2)`).join(',');
  await getPool().query(`INSERT INTO plan_recommendations(user_id,product_id,slot,plan_date,kind) VALUES ${values}`, [userId, kind, ...rows.flat()]);
  // 가끔 오래된 기록을 정리한다(요청 50번에 한 번꼴).
  if (Math.random() < 0.02) await getPool().query("DELETE FROM plan_recommendations WHERE created_at < NOW() - INTERVAL '90 days'");
 } catch { /* 기록 실패는 추천에 영향 없음 */ }
}
