import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getPool} from '../../../../lib/db';
import {planProducts} from '../../../../lib/shopping-plan-catalog';
import {swapReasons} from '../../../../lib/shopping-plan';

// 관리자: 메뉴별로 무엇을 많이 먹고·저장하고·바꿨는지, 추천한 메뉴를 실제로 먹었는지(추천 후 14일 안).
export async function GET(request: NextRequest) {
 if (!await adminUser(request)) return Response.json({error: '관리자 권한이 필요해요.'}, {status: 403});
 try {
  const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days')) || 30));
  const db = getPool();
  const [eaten, snacks, saved, swapped, recommended, catalog] = await Promise.all([
   db.query(`SELECT product_id AS id, max(product_name) AS name, count(*)::int AS logs, count(DISTINCT user_id)::int AS users FROM food_intake_logs
    WHERE undone_at IS NULL AND created_at > NOW() - make_interval(days => $1) AND product_id NOT LIKE 'extra:%' AND product_id NOT LIKE 'ref:%'
    GROUP BY product_id ORDER BY users DESC, logs DESC LIMIT 50`, [days]),
   db.query(`SELECT product_id AS id, max(product_name) AS name, count(*)::int AS logs, count(DISTINCT user_id)::int AS users FROM food_intake_logs
    WHERE undone_at IS NULL AND created_at > NOW() - make_interval(days => $1) AND (product_id LIKE 'ref:%' OR product_id LIKE 'extra:%')
    GROUP BY product_id ORDER BY users DESC, logs DESC LIMIT 30`, [days]),
   db.query(`SELECT id, count(*)::int AS plans, count(DISTINCT user_id)::int AS users FROM shopping_plans, jsonb_array_elements_text(meal_ids) AS id
    WHERE created_at > NOW() - make_interval(days => $1) GROUP BY id ORDER BY users DESC, plans DESC LIMIT 50`, [days]),
   // 끼니 바꾸기 의견은 사용자별 최근 50개만 남아 있다(기간 무관 누적).
   db.query(`SELECT f->>'id' AS id, f->>'reason' AS reason, count(DISTINCT user_id)::int AS users FROM shopping_preferences, jsonb_array_elements(conditions->'swapPreferences') AS f
    GROUP BY 1,2 ORDER BY users DESC LIMIT 60`),
   db.query(`SELECT r.product_id AS id, count(*)::int AS recommended, count(DISTINCT r.user_id)::int AS users,
     count(*) FILTER (WHERE EXISTS (SELECT 1 FROM food_intake_logs l WHERE l.user_id = r.user_id AND l.product_id = r.product_id AND l.undone_at IS NULL
       AND l.created_at >= r.created_at AND l.created_at < r.created_at + INTERVAL '14 days'))::int AS eaten
    FROM plan_recommendations r WHERE r.created_at > NOW() - make_interval(days => $1) GROUP BY r.product_id ORDER BY recommended DESC LIMIT 80`, [days]),
   planProducts(),
  ]);
  const names = new Map(catalog.map((p) => [p.id, p.name]));
  const name = (id: string, fallback?: string) => (names.get(id) ?? fallback ?? id).split('_').join(' · ');
  const totals = (await db.query(`SELECT
    (SELECT count(*)::int FROM plan_recommendations WHERE created_at > NOW() - make_interval(days => $1)) AS recommended,
    (SELECT count(*)::int FROM food_intake_logs WHERE undone_at IS NULL AND created_at > NOW() - make_interval(days => $1)) AS logs`, [days])).rows[0];
  return Response.json({
   days, totals,
   eaten: eaten.rows.map((r) => ({...r, name: name(r.id, r.name)})),
   snacks: snacks.rows.map((r) => ({...r, name: r.name})),
   saved: saved.rows.map((r) => ({...r, name: name(r.id)})),
   swapped: swapped.rows.map((r) => ({...r, name: name(r.id), reason: swapReasons[r.reason as keyof typeof swapReasons] ?? r.reason})),
   recommended: recommended.rows.map((r) => ({...r, name: name(r.id)})),
  }, {headers: {'Cache-Control': 'no-store'}});
 } catch {
  return Response.json({error: '메뉴 통계를 불러오지 못했어요.'}, {status: 503});
 }
}
