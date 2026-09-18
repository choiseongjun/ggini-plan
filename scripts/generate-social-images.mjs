import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Reuse the site's mascot. Run on a machine with Korean/Traditional Chinese fonts.
const source = await readFile(new URL('../app/rice-buddy.tsx', import.meta.url), 'utf8');
const mascot = source.slice(source.indexOf('<ellipse'), source.indexOf('</svg>'))
  .replaceAll('strokeWidth=', 'stroke-width=').replaceAll('strokeLinecap=', 'stroke-linecap=');
const directory = new URL('../public/og/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const [market, brand, first, second, description, tags, font] of [
  ['ko', '끼니플랜', '내 예산에 맞게,', '오늘도 잘 먹어요.', '뭘 먹을지부터 장보기까지 한 번에', '식단 추천   ·   장보기   ·   식비 기록', 'Malgun Gothic'],
  ['tw', 'GginiPlan 台灣', '照顧每餐，', '也照顧你的預算。', '從今天吃什麼，到這週買什麼', '餐點推薦   ·   購物清單   ·   餐費紀錄', 'Microsoft JhengHei'],
]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#fffaf0"/>
    <rect x="22" y="22" width="1156" height="586" rx="36" fill="none" stroke="#e5e9d5" stroke-width="2"/>
    <circle cx="1006" cy="272" r="236" fill="#edf1dc"/>
    <circle cx="1068" cy="102" r="42" fill="#f9e59f"/>
    <circle cx="823" cy="477" r="40" fill="#f6cdbb"/>
    <g font-family="${font}, sans-serif" fill="#304f3d">
      <text x="72" y="106" font-size="31" font-weight="700">${brand}</text>
      <text x="72" y="230" font-size="58" font-weight="700">${first}</text>
      <text x="72" y="310" font-size="58" font-weight="700">${second}</text>
      <text x="76" y="376" font-size="26" fill="#67755e">${description}</text>
      <rect x="72" y="420" width="566" height="64" rx="32" fill="#e8efdf"/>
      <text x="100" y="461" font-size="25" font-weight="700">${tags}</text>
      <text x="76" y="558" font-size="23" fill="#7d8874">gginiplan.kr</text>
    </g>
    <g transform="translate(756 125) scale(1.64)">${mascot}</g>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL(`meal-plan-${market}-v1.png`, directory)));
}
