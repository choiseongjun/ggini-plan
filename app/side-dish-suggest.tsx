'use client';

import {useEffect, useState} from 'react';
import {servingNutrients} from '../lib/serving-nutrients';
import type {PlanConditions, PlanProduct} from '../lib/shopping-plan';
import {ProductThumb} from './product-thumb';
import {usePlanEngine} from './plan-engine';
import {RecipeVideos} from './recipe-videos';
import type {SideExtra} from '../lib/side-pairing';
import './side-dish-suggest.css';

const clean = (name: string) => name.split('_')[0].replace(/\([^)]*\)/g, '').trim();

// 메인 요리에 어울리는 밑반찬 3개(AI로 분류해 둔 맛·조리법·주재료로 짝지음). 펼칠 때 불러온다.
export function SideDishSuggest({main, conditions}: {main: PlanProduct; conditions: PlanConditions}) {
 const engine = usePlanEngine();
 const [sides, setSides] = useState<{product: PlanProduct; reason: string}[] | null>(null);
 const [extras, setExtras] = useState<SideExtra[]>([]);
 const [error, setError] = useState(''), [open, setOpen] = useState<string | null>(null), [video, setVideo] = useState<string | null>(null), [round, setRound] = useState(0);
 useEffect(() => {
  let alive = true;
  engine.sides(main.id, conditions).then((d) => { if (alive) { setSides(d.sides); setExtras(d.extras); setError(''); } }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : '반찬을 불러오지 못했어요.'); });
  return () => { alive = false; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [main.id, round, engine]);
 if (error) return <p className="sd-note" role="alert">{error}</p>;
 if (!sides) return <p className="sd-note" aria-busy="true">어울리는 반찬을 고르고 있어요…</p>;
 // 양식·빵·샐러드: 음료·수프·샐러드·소스 같은 곁들임.
 if (extras.length) return <ul className="sd-list">{extras.map((x) => <li key={x.name}>
  <div className="sd-row"><span className="sd-kind">{x.kind}</span><div><strong>{x.name}</strong><span>{x.reason}</span>{x.kcal !== null && <small>{x.serving ? `1인분 ${x.serving} · ` : ''}약 {Math.round(x.kcal)}kcal</small>}</div></div>
 </li>)}</ul>;
 if (!sides.length) return <p className="sd-note">이 메뉴에 맞는 곁들임을 아직 준비하지 못했어요.</p>;
 return <div className="sd-wrap">
  <ul className="sd-list">{sides.map(({product: p, reason}) => { const kcal = servingNutrients(p).calories; const isOpen = open === p.id; return <li key={p.id}>
   <div className="sd-row"><ProductThumb item={p}/><div><strong>{clean(p.name)}</strong><span>{reason}</span><small>반찬 1인분{kcal !== null ? ` · 약 ${Math.round(kcal)}kcal` : ''}</small></div></div>
   <div className="sd-actions">
    {p.recipe && p.recipe.ingredients.length > 0 && <button type="button" className="sd-toggle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>{isOpen ? '재료 접기' : '재료 보기'}</button>}
    <button type="button" className="sd-toggle" aria-expanded={video === p.id} onClick={() => setVideo(video === p.id ? null : p.id)}>{video === p.id ? '영상 접기' : '만드는 법 영상'}</button>
   </div>
   {isOpen && <p className="sd-ing">{p.recipe!.ingredients.map((i) => i.label).join(' · ')}</p>}
   {video === p.id && <div className="sd-video"><RecipeVideos dishId={p.id}/></div>}
  </li>; })}</ul>
  <button type="button" className="sd-again" onClick={() => { setSides(null); setRound((n) => n + 1); }}>다른 반찬 보기</button>
 </div>;
}
