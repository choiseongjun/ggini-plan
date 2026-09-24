// IndexNow로 새·바뀐 페이지를 검색엔진(빙·네이버·얀덱스 등)에 알린다. 한 곳에 보내면 참여 검색엔진에 공유된다.
// 키 파일: public/fe5e4716741bb63bdcbbafea3b8ac4c2.txt (배포돼 있어야 한다)
//   node --env-file=.env.local --import tsx scripts/indexnow.ts            사이트맵의 주요 페이지 + 음식 페이지 전체
//   node --env-file=.env.local --import tsx scripts/indexnow.ts /kcal/순대국밥 /  특정 주소만
import {guides} from '../lib/guides';
import {foodPagePath, foodPageSlugs} from '../lib/food-pages';

const HOST = 'gginiplan.kr', KEY = 'fe5e4716741bb63bdcbbafea3b8ac4c2';
const base = `https://${HOST}`;

async function main() {
 const args = process.argv.slice(2);
 const paths = args.length ? args : ['/', '/kcal', '/guides', ...guides.map((g) => `/guides/${g.slug}`), ...(await foodPageSlugs()).map(foodPagePath)];
 const urls = paths.map((p) => base + p);
 // 키 파일이 배포됐는지 먼저 확인(없으면 검색엔진이 거절한다).
 const key = await fetch(`${base}/${KEY}.txt`).then((r) => r.ok ? r.text() : '');
 if (key.trim() !== KEY) throw new Error('키 파일이 아직 배포되지 않았어요. 커밋·배포 후 다시 실행해 주세요.');
 for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const r = await fetch('https://api.indexnow.org/indexnow', {
   method: 'POST', headers: {'Content-Type': 'application/json; charset=utf-8'},
   body: JSON.stringify({host: HOST, key: KEY, keyLocation: `${base}/${KEY}.txt`, urlList: batch}),
  });
  console.log(`${i + batch.length}/${urls.length} → HTTP ${r.status} ${r.status === 200 || r.status === 202 ? '접수됨' : await r.text()}`);
 }
}
main().then(() => process.exit(0), (e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
