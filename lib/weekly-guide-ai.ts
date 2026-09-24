import {getPool} from './db';
import {guideContext, type WeeklyGuide} from './weekly-guide';

// AI 맞춤 가이드: 규칙으로 계산한 목표 수치·최근 기록을 바탕으로 AI가 "이 사람에게 맞는 말"을 쓴다.
// 숫자는 AI가 새로 만들지 않는다(주어진 값만 인용). 결과는 weekly_guides에 저장해 두고 화면은 저장본을 읽는다.
const MODEL = process.env.OPENAI_GUIDE_MODEL?.trim() || 'gpt-4.1-mini';
type AiText = Pick<WeeklyGuide, 'headline' | 'points' | 'focus' | 'eatMore' | 'eatLess' | 'plate'>;

const instructions = `너는 한국 사용자에게 이번 주 식사 방향을 알려 주는 식단 코치야. 입력(JSON)은 이 사용자의 정보와, 영양 기준으로 이미 계산된 하루 목표(dailyTargets)와 최근 7일 기록 평균(recent7Days, 없으면 기록 부족)이야.
규칙:
- 모든 문장은 한국어 해요체, 짧고 구체적으로. 이모지 금지.
- 숫자는 입력에 있는 값만 인용해. 새로운 목표 수치나 칼로리를 만들지 마.
- 질병 진단·치료·약·보충제 권유 금지. 혈당·혈압 관리는 일반적인 식사 습관 수준으로만.
- avoidFoods(못 먹는 재료)는 권하지 마.
- 최근 기록이 있으면 그 기록(목표 대비 부족·과다, frequentlyEaten)에 근거해 조언해. 기록이 없거나 2일 미만이면 focus 하나는 "먹은 걸 3일 이상 기록하기"를 권해.
- 한국 가정식 기준으로 실천 가능한 행동을 제시해(예: 국물은 절반, 밥은 2/3공기, 끼니마다 손바닥 크기 단백질).
출력:
- headline: 이 사람에게 이번 주 핵심을 한 문장(40자 안팎).
- focus: 이번 주 집중할 것 3개. title(20자 이내, 행동 중심), detail(1~2문장, 왜·어떻게).
- eatMore / eatLess: 음식·습관 3~6개씩, 각 12자 이내.
- plate: 한 끼 구성 3줄(단백질·밥·채소 양), 목표에 맞게.`;

const schema = {type: 'object', additionalProperties: false, required: ['headline', 'focus', 'eatMore', 'eatLess', 'plate'], properties: {
 headline: {type: 'string'},
 focus: {type: 'array', items: {type: 'object', additionalProperties: false, required: ['title', 'detail'], properties: {title: {type: 'string'}, detail: {type: 'string'}}}},
 eatMore: {type: 'array', items: {type: 'string'}}, eatLess: {type: 'array', items: {type: 'string'}}, plate: {type: 'array', items: {type: 'string'}},
}};

async function writeWithAi(input: Record<string, unknown>): Promise<AiText> {
 if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY 없음');
 const r = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST', headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}`, 'Content-Type': 'application/json'},
  signal: AbortSignal.timeout(40000),
  body: JSON.stringify({model: MODEL, store: false, instructions, input: [{role: 'user', content: JSON.stringify(input)}], max_output_tokens: 1500, text: {format: {type: 'json_schema', name: 'weekly_guide', strict: true, schema}}}),
 });
 if (!r.ok) throw new Error(`OpenAI ${r.status}`);
 const d = await r.json();
 const text = (d.output ?? []).filter((o: {type: string}) => o.type === 'message').flatMap((o: {content: {type: string; text?: string}[]}) => o.content).filter((c: {type: string}) => c.type === 'output_text').map((c: {text: string}) => c.text).join('');
 const v = JSON.parse(text) as {headline: string; focus: {title: string; detail: string}[]; eatMore: string[]; eatLess: string[]; plate: string[]};
 const clean = (s: unknown, max: number) => typeof s === 'string' ? s.trim().slice(0, max) : '';
 const focus = (v.focus ?? []).map((f) => ({title: clean(f.title, 40), detail: clean(f.detail, 220)})).filter((f) => f.title && f.detail).slice(0, 3);
 if (!clean(v.headline, 90) || !focus.length) throw new Error('빈 가이드');
 return {headline: clean(v.headline, 90), focus, points: focus.map((f) => f.title),
  eatMore: (v.eatMore ?? []).map((x) => clean(x, 24)).filter(Boolean).slice(0, 6), eatLess: (v.eatLess ?? []).map((x) => clean(x, 24)).filter(Boolean).slice(0, 6), plate: (v.plate ?? []).map((x) => clean(x, 60)).filter(Boolean).slice(0, 4)};
}

// 새로 만들어야 하는지: 정보가 바뀌었으면 바로, 기록 평균이 달라졌으면 6시간 뒤, 그 밖엔 7일마다.
function stale(row: {profile_key: string; recent_key: string; created_at: Date} | undefined, profileKey: string, recentKey: string) {
 if (!row || row.profile_key !== profileKey) return true;
 const age = Date.now() - row.created_at.getTime();
 return age > 7 * 86400000 || (row.recent_key !== recentKey && age > 6 * 3600000);
}

export async function generateAiGuide(userId: string, force = false) {
 const ctx = await guideContext(userId);
 if (!ctx.input) return null;
 const row = (await getPool().query('SELECT profile_key, recent_key, created_at FROM weekly_guides WHERE user_id=$1', [userId])).rows[0];
 if (!force && !stale(row, ctx.profileKey, ctx.recentKey)) return null;
 const text = await writeWithAi(ctx.input);
 await getPool().query(`INSERT INTO weekly_guides(user_id,content,profile_key,recent_key,model) VALUES($1,$2,$3,$4,$5)
  ON CONFLICT(user_id) DO UPDATE SET content=EXCLUDED.content,profile_key=EXCLUDED.profile_key,recent_key=EXCLUDED.recent_key,model=EXCLUDED.model,created_at=NOW()`,
  [userId, JSON.stringify(text), ctx.profileKey, ctx.recentKey, MODEL]);
 return text;
}

// 화면용: 숫자(목표·최근 평균·체중)는 지금 계산값, 문장은 저장된 AI 가이드(정보가 바뀌기 전 것만). 새로 만들 필요가 있으면 needsRefresh.
export async function personalGuide(userId: string): Promise<{guide: WeeklyGuide; needsRefresh: boolean}> {
 const ctx = await guideContext(userId);
 if (!ctx.input) return {guide: ctx.guide, needsRefresh: false};
 const row = (await getPool().query<{content: AiText; profile_key: string; recent_key: string; created_at: Date}>('SELECT content, profile_key, recent_key, created_at FROM weekly_guides WHERE user_id=$1', [userId])).rows[0];
 const needsRefresh = stale(row, ctx.profileKey, ctx.recentKey);
 const usable = row && row.profile_key === ctx.profileKey;
 return {guide: usable ? {...ctx.guide, ...row.content, ai: true} : ctx.guide, needsRefresh};
}
