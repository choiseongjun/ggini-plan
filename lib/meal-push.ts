import webpush from 'web-push';
import {getPool} from './db';
import {planDate} from './daily-plan';
import {mealSchedule,parseConditions,slotLabels,type MealSlot} from './shopping-plan';
import {planProducts} from './shopping-plan-catalog';

// 식사 시간 알림. "오늘 뭐 먹을지"를 알려 주고, 누르면 그 끼니 기록으로 바로 간다 — 알림은 추천 입구가 아니라 기록 입구.
// [먹었어요] 버튼을 누르면 앱을 열지 않고 알림에서 바로 1인분이 기록된다(public/sw.js).
export type MealTimes = Partial<Record<MealSlot, string>>;
export const DEFAULT_MEAL_TIMES: MealTimes = {lunch: '12:00', dinner: '18:30'};
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];
const SLOT_EMOJI: Record<MealSlot, string> = {breakfast: '☀️', lunch: '🌤️', dinner: '🌙'};
// 예약 작업이 늦게 돌아도 놓치지 않게, 알림 시각부터 이만큼은 보낼 수 있다.
const GRACE_MINUTES = 60;

export function parseMealTimes(value: unknown): MealTimes | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: MealTimes = {};
  for (const [slot, time] of Object.entries(value)) {
    if (!SLOTS.includes(slot as MealSlot)) return null;
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    out[slot as MealSlot] = time;
  }
  return out;
}

export function pushConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(), privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@example.com', publicKey, privateKey);
  return true;
}

const kstNow = () => new Date(Date.now() + 9 * 3600000);
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

type Row = {endpoint: string; user_id: string; keys: {p256dh: string; auth: string}; times: MealTimes; sent: Record<string, string>};

// 지금(KST) 알림 시각이 지난 끼니 중 오늘 아직 안 보낸 것을 보낸다. 15분마다 호출된다.
export async function dispatchMealReminders() {
  if (!pushConfigured()) return {sent: 0, skipped: 0, removed: 0, error: 'VAPID 키가 설정되지 않았어요.'};
  const now = kstNow(), today = now.toISOString().slice(0, 10), minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  const rows = (await getPool().query<Row>('SELECT endpoint,user_id::text,keys,times,sent FROM push_subscriptions')).rows;
  const due = rows.flatMap((row) => SLOTS.filter((slot) => {
    const time = row.times?.[slot];
    if (!time || row.sent?.[slot] === today) return false;
    const diff = minute - minutesOf(time);
    return diff >= 0 && diff < GRACE_MINUTES;
  }).map((slot) => ({row, slot})));
  if (!due.length) return {sent: 0, skipped: 0, removed: 0};

  const users = [...new Set(due.map((d) => d.row.user_id))];
  const [plans, recent] = await Promise.all([
    getPool().query('SELECT DISTINCT ON (user_id) user_id::text, conditions, meal_ids AS "mealIds" FROM shopping_plans WHERE user_id = ANY($1::bigint[]) ORDER BY user_id, id DESC', [users]),
    getPool().query(`SELECT DISTINCT user_id::text FROM food_intake_logs WHERE user_id = ANY($1::bigint[]) AND undone_at IS NULL AND created_at > NOW() - INTERVAL '2 hours' AND product_id NOT LIKE 'ref:%' AND product_id NOT LIKE 'extra:%'`, [users]),
  ]);
  const planByUser = new Map(plans.rows.map((r) => [r.user_id as string, r]));
  const ateRecently = new Set(recent.rows.map((r) => r.user_id as string));
  const products = await planProducts();

  let sent = 0, skipped = 0, removed = 0;
  for (const {row, slot} of due) {
    const markSent = () => getPool().query(`UPDATE push_subscriptions SET sent = sent || jsonb_build_object($2::text, $3::text) WHERE endpoint = $1`, [row.endpoint, slot, today]);
    // 방금 먹었다고 기록했으면 굳이 알리지 않는다.
    if (ateRecently.has(row.user_id)) { skipped++; await markSent(); continue; }
    const payload = reminderPayload(todaysMenu(planByUser.get(row.user_id), slot, today, products), slot);
    try {
      await webpush.sendNotification({endpoint: row.endpoint, keys: row.keys}, JSON.stringify(payload), {TTL: 60 * 60});
      sent++; await markSent();
    } catch (e) {
      const status = (e as {statusCode?: number}).statusCode;
      // 404/410: 브라우저가 구독을 해지했다 — 지운다.
      if (status === 404 || status === 410) { await getPool().query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]); removed++; }
      else skipped++;
    }
  }
  return {sent, skipped, removed};
}

function reminderPayload(menu: {name: string; productId: string} | null, slot: MealSlot) {
  return menu
    ? {title: `${SLOT_EMOJI[slot]} 오늘 ${slotLabels[slot]}은 ${menu.name}`, body: '먹고 나면 [먹었어요]만 눌러 주세요. 사진으로 남기려면 알림을 눌러요.', tag: `meal-${slot}`,
       url: `/?from=push&meal=${encodeURIComponent(menu.productId)}`, productId: menu.productId, menuName: menu.name, actions: [{action: 'eaten', title: '먹었어요'}, {action: 'open', title: '사진으로 기록'}]}
    : {title: `${SLOT_EMOJI[slot]} ${slotLabels[slot]} 챙길 시간이에요`, body: '오늘 뭐 먹을지 버튼 한 번이면 정해 드려요.', tag: `meal-${slot}`, url: '/?from=push'};
}

// 테스트 알림: 지금 시간대(아침·점심·저녁)의 실제 알림을 이 기기로 바로 보낸다. 발송 기록(sent)은 건드리지 않는다.
export async function sendTestReminder(userId: string, endpoint: string) {
  if (!pushConfigured()) return {ok: false, error: '서버에 알림 키가 설정되지 않았어요.'};
  const row = (await getPool().query<Row>('SELECT endpoint,user_id::text,keys,times,sent FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2', [endpoint, userId])).rows[0];
  if (!row) return {ok: false, error: '이 기기의 알림 구독을 찾지 못했어요. 알림을 껐다가 다시 켜 주세요.'};
  const now = kstNow(), today = now.toISOString().slice(0, 10), hour = now.getUTCHours();
  const slot: MealSlot = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : 'dinner';
  const plan = (await getPool().query('SELECT conditions, meal_ids AS "mealIds" FROM shopping_plans WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId])).rows[0];
  const payload = reminderPayload(todaysMenu(plan, slot, today, await planProducts()), slot);
  try {
    await webpush.sendNotification({endpoint: row.endpoint, keys: row.keys}, JSON.stringify({...payload, title: `[테스트] ${payload.title}`, tag: 'meal-test'}), {TTL: 600});
    return {ok: true, withMenu: 'productId' in payload};
  } catch (e) {
    const status = (e as {statusCode?: number}).statusCode;
    if (status === 404 || status === 410) { await getPool().query('DELETE FROM push_subscriptions WHERE endpoint=$1', [row.endpoint]); return {ok: false, error: '브라우저의 알림 구독이 만료됐어요. 알림을 다시 켜 주세요.'}; }
    return {ok: false, error: '푸시 서버로 보내지 못했어요. 잠시 후 다시 시도해 주세요.'};
  }
}

export function todaysMenu(plan: {conditions: unknown; mealIds: string[]} | undefined, slot: MealSlot, today: string, products: {id: string; name: string}[]) {
  const c = parseConditions(plan?.conditions);
  if (!c || !plan || !Array.isArray(plan.mealIds)) return null;
  const start = c.startDate;
  if (!start) return null;
  const schedule = mealSchedule(c);
  const index = schedule.findIndex((s) => s.slot === slot && planDate(start, s.day) === today);
  if (index < 0) return null;
  const product = products.find((p) => p.id === plan.mealIds[index]);
  return product ? {name: product.name.split('_').join(' · '), productId: product.id} : null;
}
