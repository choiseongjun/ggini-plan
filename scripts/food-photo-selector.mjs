// Local CPU inference only. Downloads model weights once; no paid inference API.
import { pipeline, RawImage, env } from '@huggingface/transformers';
import { mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve('.cache/food-photo-review');
mkdirSync(directory, {recursive: true});
env.cacheDir = resolve(directory, 'models');
const cachePath = resolve(directory, 'scores-v1.jsonl');
const cache = new Map();
try {
 for (const line of readFileSync(cachePath, 'utf8').split('\n').filter(Boolean)) {
  try { const entry = JSON.parse(line); cache.set(entry.url, entry); } catch { /* interrupted write */ }
 }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const labels = [
 'a close-up photo of a finished meal served on a plate or in a bowl',
 'a photo of food cooking in a pan or pot',
 'a photo of raw ingredients and vegetables',
 'a portrait of a person or a human face',
 'a person presenting a cooking show on television',
 'a photo of mountains, scenery or a landscape',
 'a screenshot with text, a logo or an advertisement',
 'a photo of packaged products in a store',
 'a cartoon or illustration',
];
let classifier;
export async function selectFoodPhotos(urls) {
 const scored = [];
 for (const url of [...new Set(urls)]) {
  if (!/^https:\/\/search\d*\.kakaocdn\.net\//.test(url)) continue;
  let score = cache.get(url);
  if (!score) {
   classifier ??= await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', {dtype: 'q8', device: 'cpu'});
   const response = await fetch(url, {signal: AbortSignal.timeout(15000), redirect: 'error'});
   if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
   const blob = await response.blob();
   if (blob.size > 5 * 1024 * 1024) throw new Error('Image too large');
   const image = await RawImage.fromBlob(blob);
   const result = await classifier(image, labels);
   const food = result.find((r) => r.label === labels[0]).score;
   const other = Math.max(...result.filter((r) => r.label !== labels[0]).map((r) => r.score));
   score = {url, food, other};
   appendFileSync(cachePath, JSON.stringify(score) + '\n');
   cache.set(url, score);
  }
  // Relative CLIP scores are a heuristic, not calibrated probabilities.
  if (score.food >= 0.65 && score.food >= score.other * 3) scored.push(score);
 }
 return scored.sort((a, b) => b.food - a.food).map((r) => r.url);
}
