// Prefer the configured NAVER API HUB search; retain Kakao as a fallback.
import {searchNaverDishImages} from './naver-dish-images';
export type KakaoImageResult = {thumbnail: string; link: string; sourceHost: string};

// Recipe/food-blog sites return an actual cooked-dish photo far more reliably than a generic web image
// search — a shopping-site or stock-photo hit is a common source of the "애매한" (off-target) matches
// this backfill kept producing (e.g. a raw packaged ingredient instead of the finished dish).
const PREFERRED_HOSTS = /(?:^|\.)(?:10000recipe\.com|wtable\.co\.kr|haemuknyeo\.com|blog\.naver\.com|m\.blog\.naver\.com|post\.naver\.com|manzil\.co\.kr)$/;
const AVOID_HOSTS = /(?:^|\.)(?:coupang\.com|gmarket\.co\.kr|11st\.co\.kr|auction\.co\.kr|ssg\.com|market\.naver\.com|smartstore\.naver\.com)$/;

export function parseKakaoImageResults(data: unknown): KakaoImageResult[] {
 if (!data || typeof data !== 'object' || !('documents' in data) || !Array.isArray(data.documents)) return [];
 return data.documents.flatMap((doc) => {
  const thumbnail = doc?.thumbnail_url, link = doc?.image_url, docUrl = doc?.doc_url;
  if (typeof thumbnail !== 'string' || !/^https:\/\/search\d*\.kakaocdn\.net\//.test(thumbnail)) return [];
  let sourceHost = '';
  try { sourceHost = typeof docUrl === 'string' ? new URL(docUrl).hostname : ''; } catch { /* keep empty */ }
  return [{thumbnail, link: typeof link === 'string' ? link : thumbnail, sourceHost}];
 }).filter((r) => !AVOID_HOSTS.test(r.sourceHost));
}

// Strips govDB variant-naming artifacts ("미역국_소고기" -> "미역국 소고기"). Queries for "레시피"
// (recipe) rather than "음식" (food) — recipe-blog search results are actual cooked-dish photography
// far more often than the generic "food" query, which pulled in unrelated lifestyle/product photos.
export function dishImageQuery(dishName: string): string {
 return `${dishName.replace(/_/g, ' ').replace(/\(.*?\)/g, '').trim()} 레시피`;
}

// Returns several candidates (preferred recipe/food-blog hosts first) instead of a single guess, so
// the UI can show a small gallery — one search hit being off-target is far less of a problem than
// trusting it as the only photo.
export async function searchDishImages(dishName: string, count = 6): Promise<KakaoImageResult[]> {
 try { const images=await searchNaverDishImages(dishName,count); if(images.length)return images; } catch { /* Kakao remains available if Naver fails. */ }
 const key = process.env.KAKAO_REST_API_KEY;
 if (!key) throw new Error('KAKAO_REST_API_KEY is not set in the environment.');
 const url = new URL('https://dapi.kakao.com/v2/search/image');
 url.search = new URLSearchParams({query: dishImageQuery(dishName), sort: 'accuracy', size: '15'}).toString();
 const response = await fetch(url, {headers: {Authorization: `KakaoAK ${key}`}, signal: AbortSignal.timeout(10000)});
 if (!response.ok) throw new Error(`Kakao image search HTTP ${response.status}`);
 const results = parseKakaoImageResults(await response.json());
 const preferred = results.filter((r) => PREFERRED_HOSTS.test(r.sourceHost));
 const rest = results.filter((r) => !PREFERRED_HOSTS.test(r.sourceHost));
 return [...preferred, ...rest].slice(0, count);
}
