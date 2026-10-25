import catalogue from '../data/daily-menu-v1.json';
import legacy from '../data/daily-menu-legacy.json';

// Prelaunch curation. Keep replaced recipes accessible to existing local saves.
export type DailyMenu = Omit<(typeof legacy)[number], 'ingredients'> & {ingredients: {name: string; label: string; optional?: boolean}[]};
export const dailyMenuCatalogue: readonly DailyMenu[] = [...catalogue, ...legacy];
export const activeDailyMenuIds = new Set(catalogue.map(menu => menu.id));
export const DAILY_MENU_STORAGE = 'kkiniplan-daily-menu-v1';
export function koreaDate(now = new Date()) {
 return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function validEdition(date: string) {
 return /^20\d{2}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
}
export function dailyMenus(date: string): DailyMenu[] {
 if (!validEdition(date)) return [];
 const day = Math.floor(Date.parse(date) / 86400000);
 return [0,1,2].map(group => {
  const pool = catalogue.filter(menu => menu.group === group);
  return pool[(day + group) % pool.length];
 });
}
export type DailyMenuCollection = {saved: string[]; choice: {date: string; id: string} | null};
export function readDailyMenuCollection(raw: string | null): DailyMenuCollection {
 const empty: DailyMenuCollection = {saved: [], choice: null};
 try {
  const data = JSON.parse(raw ?? 'null');
  if (!data || typeof data !== 'object') return empty;
  const known = (id: unknown): id is string => typeof id === 'string' && dailyMenuCatalogue.some(menu => menu.id === id);
  const saved = Array.isArray(data.saved) ? [...new Set<string>(data.saved.filter(known))] : [];
  const choice = data.choice && validEdition(data.choice.date ?? '') && known(data.choice.id) ? {date:data.choice.date,id:data.choice.id} : null;
  return {saved,choice};
 } catch { return empty; }
}
