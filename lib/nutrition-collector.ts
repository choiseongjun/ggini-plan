import { join } from 'node:path';
import sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';
import { emptyNutrition, extractNutrition, hasMultipleNutritionTables, type ExtractedNutrition } from './nutrition-ocr';

export function nutritionProductUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
    !((url.hostname === 'www.kurly.com' && /^\/goods\/\d+$/.test(url.pathname)) ||
      (url.hostname === 'www.oasis.co.kr' && /^\/product\/detail\/\d+$/.test(url.pathname)))) throw new Error('현재 컬리·오아시스의 기본 상품 링크를 지원합니다.');
  return url;
}
export function allowedNutritionImage(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
    ['product-image.kurly.com', 'img-cf.kurly.com', 'oasisprodproduct.edge.naverncp.com'].includes(u.hostname); } catch { return false; }
}
async function download(url: string, maxBytes: number) {
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`판매처 응답 오류 (${response.status})`);
  const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length;
    if (size > maxBytes) throw new Error('원문 크기가 너무 큽니다. 상품 관리에서 영양표를 첨부해 주세요.'); chunks.push(value); }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
const plain = (v: string) => v.replace(/<[^>]+>/g, '\n').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
export function nutritionSources(html: string, productUrl: string): {text: string; images: string[]} {
  const url = nutritionProductUrl(productUrl);
  let text = ''; const images: string[] = [];
  if (url.hostname === 'www.kurly.com') {
    const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    const p = raw ? JSON.parse(raw).props?.pageProps?.product : null;
    if (!p || String(p.no) !== url.pathname.split('/').pop() || p.isGroupProduct || p.isMultiplePrice || p.dealProducts?.length > 1) throw new Error('상품 또는 옵션 구성을 확인해 주세요.');
    const notices = (p.productNotice ?? []).flatMap((group: {notices?: {type: string; content?: string; value?: string; description?: string}[]}) => group.notices ?? []);
    text = notices.filter((n: {type: string}) => n.type === 'PN06').map((n: {content?: string; value?: string; description?: string}) => plain(n.content ?? n.value ?? n.description ?? '')).join('\n');
    const detail = p.productDetail;
    const candidates = [...(detail?.legacyPiImages ?? []), ...(detail?.contentDescription?.productImages ?? []).flatMap((v: {content?: {noticeImages?: unknown[]}}) => v.content?.noticeImages ?? [])];
    for (const v of candidates) { const image = typeof v === 'string' ? v : v?.image?.path ?? v?.path ?? v?.url; if (typeof image === 'string') images.push(image); }
  } else {
    // Only table rows labelled as nutrition; unrelated product text is not a nutrition source.
    for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      if (/영양\s*성분|영양\s*정보/.test(plain(row[1]))) text += plain(row[1]) + '\n';
    }
    for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
      if (/영양|표시사항|품질표시/.test(image[0])) { const src = image[0].match(/\bsrc=["']([^"']+)["']/i)?.[1]; if (src) images.push(src); }
    }
  }
  return { text: text.trim(), images: [...new Set(images.filter(allowedNutritionImage))].slice(0, 8) };
}
export function completeNutrition(n: ExtractedNutrition) {
  return Boolean(n.nutritionBasis?.trim()) && [n.caloriesKcal, n.proteinG, n.carbohydratesG, n.fatG, n.sodiumMg].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100000);
}
export async function collectNutrition(productUrl: string, imageIndex?: number) {
  nutritionProductUrl(productUrl);
  const {text: sourceText, images} = nutritionSources((await download(productUrl, 5_000_000)).toString('utf8'), productUrl);
  let text = sourceText, extracted = extractNutrition(text), warning: string | null = null, imageUrl: string | null = null;
  if (imageIndex !== undefined || !completeNutrition(extracted)) {
    imageUrl = images[imageIndex ?? 0] ?? null;
    if (imageIndex !== undefined && !imageUrl) throw new Error('선택한 영양표가 없습니다. 다시 수집해 주세요.');
    if (imageUrl) {
      const bytes = await download(imageUrl, 8_000_000);
      const image = await sharp(bytes, {limitInputPixels: 25_000_000}).rotate().resize({width: 2800, height: 4000, fit: 'inside'}).normalize().png().toBuffer();
      const worker = await createWorker('kor+eng', 1, {langPath: join(process.cwd(), 'assets', 'ocr')});
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await worker.setParameters({tessedit_pageseg_mode: PSM.SPARSE_TEXT});
        const result = await Promise.race([worker.recognize(image), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('사진 인식 시간이 초과됐습니다. 영양표를 잘라 첨부해 주세요.')), 20000); })]);
        text = result.data.text.trim();
        warning = result.data.confidence < 70 ? '인식 정확도가 낮습니다. 원본 영양표를 확인해 주세요.' : null;
        extracted = warning ? {...emptyNutrition} : extractNutrition(text);
      } finally { clearTimeout(timer); await worker.terminate(); }
    }
  }
  if (hasMultipleNutritionTables(text)) { extracted = {...emptyNutrition}; warning = '여러 영양표가 섞여 있습니다. 상품 관리에서 표 하나를 선택해 입력해 주세요.'; }
  if (!completeNutrition(extracted)) warning ??= '기준량과 5가지 영양 수치를 모두 확인하지 못했습니다. 원문 확인이 필요합니다.';
  return {text: text.slice(0, 16000), extracted, warning, images, imageUrl, sourceUrl: productUrl};
}
