import type {PlanProduct} from './shopping-plan';

// 메인 요리에 어울리는 밑반찬 고르기. 각 메뉴의 특징(맛·조리법·무게감·주재료·채소량)은 AI로 한 번 판정해 둔
// data/dish-traits.json을 쓰고, 짝짓기는 규칙으로 한다(매번 AI를 부르지 않아 즉시·무료).
export const METHODS = ['볶음', '조림', '무침', '나물', '생채', '김치', '장아찌', '전', '튀김', '구이', '찜', '국물', '기타'] as const;
export const MAIN_INGREDIENTS = ['pork', 'beef', 'chicken', 'duck', 'fish', 'seafood', 'egg', 'tofu', 'bean', 'vegetable', 'mushroom', 'seaweed', 'potato', 'noodle', 'rice', 'dairy', 'other'] as const;
export type DishTraits = {spicy: 0 | 1 | 2; salty: 0 | 1 | 2; sweet: 0 | 1 | 2; oily: 0 | 1 | 2; sour: boolean; soupy: boolean; method: typeof METHODS[number]; main: typeof MAIN_INGREDIENTS[number]; veg: 0 | 1 | 2; protein: 0 | 1 | 2; /** 반찬만: 한국 가정에서 얼마나 흔한 밑반찬인지 0~2 */ common?: 0 | 1 | 2};
export type SidePick = {product: PlanProduct; reason: string};

// 이 메인에 밑반찬이 맞는가: 밥과 먹는 한식 → 반찬 3개 / 밥·면이 든 한 그릇 → 김치류만 / 양식·빵·샐러드 → 없음.
const WESTERN = /샌드위치|토스트|베이글|크로크|파니니|브런치|핫도그|버거|피자|파스타|스파게티|까르보나라|리조또|리소토|그라탕|라자냐|뇨끼|스테이크|샐러드|포케|오믈렛|프렌치|수프|스프|타코|부리토|퀘사디아|또띠아|피타|요거트|시리얼|그래놀라|팬케이크|와플|크루아상|크로와상/;
export type SideFit = 'full' | 'kimchi' | 'none';
export function sideFit(main: PlanProduct): SideFit {
 if (!main.recipe) return 'none';
 if (main.recipe.family === 'govdb-western-breakfast' || WESTERN.test(main.name)) return 'none';
 return main.recipe.ingredients.some((i) => i.label.startsWith('함께 먹는 밥')) ? 'full' : 'kimchi';
}

const LABEL: Record<string, string> = {pork: '돼지고기', beef: '소고기', chicken: '닭고기', duck: '오리고기', fish: '생선', seafood: '해산물', egg: '달걀', tofu: '두부', bean: '콩', vegetable: '채소', mushroom: '버섯', seaweed: '해조류', potato: '감자', noodle: '면', rice: '밥', dairy: '유제품', other: '재료'};
const FRESH = new Set(['무침', '나물', '생채', '김치']);

// 점수와, 이 반찬을 권하는 이유 후보들(강한 것부터). 이유는 반찬끼리 겹치지 않게 고른다.
function score(main: DishTraits, side: DishTraits): {score: number; reasons: string[]} {
 let score = 0; const why: string[] = [];
 // 맛의 균형: 강한 메인엔 순한·상큼한 반찬.
 if (main.spicy === 2) { if (side.spicy === 0) { score += 25; why.push('맵지 않아 매운 메인 사이 입가심이 돼요'); } else if (side.spicy === 2) score -= 40; }
 if (main.oily >= 1) { if (side.sour) { score += 25; why.push('새콤해서 기름진 맛을 잡아 줘요'); } else if (FRESH.has(side.method)) { score += 20; why.push('아삭하고 산뜻해서 느끼함을 덜어 줘요'); } if (side.oily === 2) score -= 35; }
 if (main.salty === 2) { if (side.salty === 0) { score += 10; why.push('간이 세지 않아 짠맛 균형이 맞아요'); } else if (side.salty === 2) score -= 30; }
 if (main.sweet === 2 && side.sweet === 2) score -= 20;
 // 영양 보완: 채소가 적은 메인엔 채소 반찬, 단백질이 적은 메인엔 단백질 반찬.
 if (main.veg === 0 && side.veg === 2) { score += 25; why.push('채소가 부족한 메인에 채소를 더해 줘요'); }
 if (main.protein === 0 && side.protein === 2) { score += 25; why.push('단백질을 보충해 줘요'); }
 if (main.soupy && !side.soupy && ['볶음', '조림', '구이', '전'].includes(side.method)) { score += 10; why.push('국물 요리 옆에 씹는 맛을 더해 줘요'); }
 // 겹침 피하기: 같은 주재료·같은 조리법·국물+국물.
 if (main.main === side.main && side.main !== 'vegetable') score -= 60;
 if (main.method === side.method) score -= 25;
 if (main.soupy && side.soupy) score -= 50;
 if (!main.soupy && side.method === '국물') score -= 20;
 // 흔한 밑반찬(김치·계란말이·멸치볶음…)을 우선: 낯선 반찬만 나오지 않게.
 score += (side.common ?? 1) * 18;
 if (side.method === '김치' && main.method !== '김치') { score += 12; why.push('어떤 메인에도 잘 어울리는 기본 반찬이에요'); }
 why.push(`${LABEL[side.main] ?? '재료'} 반찬이라 메인과 재료가 겹치지 않아요`);
 return {score, reasons: why};
}

// 메인 하나에 반찬 count개: 점수 순으로 고르되, 이미 고른 반찬과 같은 조리법·주재료는 피하고 짠 반찬은 하나까지.
export function pickSides(main: PlanProduct, sides: PlanProduct[], traits: Record<string, DishTraits>, count = 3, exclude: (p: PlanProduct) => boolean = () => false): SidePick[] {
 const mt = traits[main.id], fit = sideFit(main);
 if (!mt || fit === 'none') return [];
 // 한 그릇·면 요리엔 김치류만(깍두기·단무지·배추김치…) 한두 가지.
 if (fit === 'kimchi') { sides = sides.filter((s) => ['김치', '장아찌'].includes(traits[s.id]?.method ?? '')); count = Math.min(count, 2); }
 const scored = sides.flatMap((s) => { const st = traits[s.id]; if (!st || exclude(s)) return []; const r = score(mt, st); return [{product: s, st, ...r, jitter: Math.random() * 22}]; })
  .sort((a, b) => (b.score + b.jitter) - (a.score + a.jitter));
 const picked: typeof scored = [];
 for (const c of scored) {
  if (picked.length >= count) break;
  if (fit === 'full' && picked.some((p) => p.st.method === c.st.method || (p.st.main === c.st.main && c.st.main !== 'vegetable'))) continue;
  if (c.st.salty === 2 && picked.some((p) => p.st.salty === 2)) continue;
  if (c.score < -10) continue;
  picked.push(c);
 }
 // 이유는 반찬마다 다른 것으로(같은 말이 세 번 반복되지 않게).
 const used = new Set<string>();
 return picked.map((p) => { const reason = p.reasons.find((r) => !used.has(r)) ?? p.reasons[0]; used.add(reason); return {product: p.product, reason}; });
}
