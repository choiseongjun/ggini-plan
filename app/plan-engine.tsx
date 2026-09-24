'use client';

import {createContext, useContext} from 'react';
import {pickerItems, type PickerItem} from '../lib/plan-picker';
import {alternativesFor, basketTotal, swapMeal, validMealIds, type PlanConditions, type PlanProduct, type SwapReason} from '../lib/shopping-plan';
import type {TodayContext} from '../lib/today-context';
import type {personalizeProducts} from '../lib/shopping-personalization';

type Personalization = ReturnType<typeof personalizeProducts>['personalization'];
export type RecommendResult = {ids: string[]; products: PlanProduct[]; today: TodayContext | null; personalization?: Personalization};

// 추천·교체·후보 목록을 계산하는 곳. 한국판은 서버(/api/shopping-plan/engine), 대만판은 받아 둔 전체 목록으로 기기에서.
// 화면 컴포넌트는 어느 쪽인지 모르고 이 인터페이스만 쓴다.
export type PlanEngine = {
 remote: boolean;
 recommend(c: PlanConditions, previous: string[], seed: number): Promise<RecommendResult>;
 swap(ids: string[], index: number, c: PlanConditions, reason?: SwapReason): Promise<{ids: string[] | null; products: PlanProduct[]}>;
 alternatives(ids: string[], index: number, c: PlanConditions, limit?: number): Promise<PlanProduct[]>;
 picker(ids: string[], index: number, c: PlanConditions): Promise<{items: PickerItem[]; current: number}>;
 products(ids: string[], c?: PlanConditions): Promise<{products: PlanProduct[]; valid?: boolean}>;
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
 const r = await fetch('/api/shopping-plan/engine', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
 const d = await r.json().catch(() => ({error: '추천을 계산하지 못했어요. 다시 시도해 주세요.'}));
 if (!r.ok) throw new Error(d.error ?? '추천을 계산하지 못했어요. 다시 시도해 주세요.');
 return d as T;
}

// learn: 서버에서 받은 메뉴(전체 정보)를 화면이 알고 있는 목록에 합친다.
export function remoteEngine(learn: (products: PlanProduct[]) => void): PlanEngine {
 const withLearn = <T extends {products: PlanProduct[]}>(d: T) => { learn(d.products); return d; };
 return {
  remote: true,
  recommend: (conditions, previous, seed) => call<RecommendResult>({action: 'recommend', conditions, previous, seed}).then(withLearn),
  swap: (ids, index, conditions, reason) => call<{ids: string[] | null; products: PlanProduct[]}>({action: 'swap', ids, index, conditions, reason}).then(withLearn),
  alternatives: (ids, index, conditions, limit) => call<{products: PlanProduct[]}>({action: 'alternatives', ids, index, conditions, limit}).then(withLearn).then((d) => d.products.slice(0, limit ?? 6)),
  picker: (ids, index, conditions) => call<{items: PickerItem[]; current: number}>({action: 'picker', ids, index, conditions}),
  products: (ids, conditions) => call<{products: PlanProduct[]; valid?: boolean}>({action: 'products', ids, conditions}).then(withLearn),
 };
}

export function localEngine(catalog: PlanProduct[]): PlanEngine {
 return {
  remote: false,
  recommend: () => Promise.reject(new Error('기기 계산은 추천 작업자(worker)에서 해요.')),
  swap: async (ids, index, c, reason) => ({ids: swapMeal(ids, index, catalog, c, reason), products: catalog}),
  alternatives: async (ids, index, c, limit) => alternativesFor(catalog, ids, c, index, limit),
  picker: async (ids, index, c) => ({items: pickerItems(catalog, ids, index, c, false), current: basketTotal(ids.filter(Boolean), catalog, c.owned, c.supply, c.people)}),
  products: async (ids, c) => ({products: catalog.filter((p) => ids.includes(p.id)), valid: c ? validMealIds(ids, catalog, c) && basketTotal(ids, catalog, c.owned, c.supply, c.people) <= c.budget : undefined}),
 };
}

export const PlanEngineContext = createContext<PlanEngine | null>(null);
export function usePlanEngine() {
 const engine = useContext(PlanEngineContext);
 if (!engine) throw new Error('PlanEngineContext가 없어요.');
 return engine;
}
