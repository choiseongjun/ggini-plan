'use client';

import {useEffect, useRef, useState} from 'react';
import type {PlanProduct} from '../lib/shopping-plan';
import {canonicalIngredient} from '../lib/ingredient-canonical';
import {basicPantryStaples, missingPantryIngredients, pantryShortage, isPantrySeasoning, pantryOptionalIngredients} from '../lib/pantry-recommendation';
import {pantryForRecommendation, pantryToday, restorePantry, parsePantryEntry, mergePantryEntries, type PantryItem} from '../lib/pantry-inventory';
import type {PhotoSource} from '../lib/pantry-photo';
import {Icon} from './app-shell';
import {PantryCookingGuide} from './pantry-cooking-guide';
import {PantryPhotoInput} from './pantry-photo-input';
import {PantryIngredientPicker} from './pantry-ingredient-picker';
import {PantryDialog} from './pantry-dialog';
import {PantryMenuDetails} from './pantry-menu-details';
import './pantry-home.css';

const mealMoods = [
  {id:'easy', label:'간편하게', description:'비슷하면 재료가 적은 순', effort:'easy', goal:'maintain'},
  {id:'everyday', label:'다양하게', description:'출처 레시피 둘러보기', effort:'everyday', goal:'maintain'},
] as const;
type Mood = typeof mealMoods[number]['id'];
type RecommendationOverride = {owned?: string[]; shopping?: boolean; mood?: Mood};
const label = (name: string) => name === '달걀' ? '계란' : name;

export function PantryHome({userId, onLogin}: {userId?: string; onLogin: () => void}) {
  const storageKey = `kkiniplan-pantry-preview-${userId ?? 'guest'}`;
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [extra, setExtra] = useState('');
  const [mood, setMood] = useState<Mood>('easy');
  const [allowShopping, setAllowShopping] = useState(true);
  const [result, setResult] = useState<PlanProduct | null>(null);
  const [choices, setChoices] = useState<PlanProduct[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [seen, setSeen] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(false);
  const [basket, setBasket] = useState<string[]>([]);
  const [cooking, setCooking] = useState(false);
  const [cleanup, setCleanup] = useState(false);
  const [usedUp, setUsedUp] = useState<string[]>([]);
  const [dialog, setDialog] = useState<'picker' | 'manage' | null>(null);
  const [detailProduct, setDetailProduct] = useState<PlanProduct | null>(null);
  const [removed, setRemoved] = useState<PantryItem | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const recipe = useRef<HTMLElement>(null);
  const errorPanel = useRef<HTMLElement>(null);
  const request = useRef<AbortController | null>(null);
  const today = pantryToday();
  const {owned, priority} = pantryForRecommendation(inventory, today);
  const mainIngredients = owned.filter(name => !isPantrySeasoning(name));
  const seasonings = owned.filter(isPantrySeasoning);
  const locked = busy || photoBusy || !ready;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let restored: PantryItem[] = [], savedBasket: string[] = [], savedSeen: string[] = [];
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        restored = restorePantry(value.inventory ?? (Array.isArray(value.owned) ? value.owned.map((name: string) => ({name})) : []));
        if (Array.isArray(value.basket)) savedBasket = value.basket.filter((name: unknown) => typeof name === 'string').slice(0, 100);
        const ids = JSON.parse(localStorage.getItem(`${storageKey}-seen`) ?? '[]');
        if (Array.isArray(ids)) savedSeen = ids.filter((id: unknown) => typeof id === 'string').slice(-60);
      } catch { /* A damaged saved value should not prevent using the home. */ }
      setInventory(restored); setBasket(savedBasket); setSeen(savedSeen); setReady(true);
      setResult(null); setError(''); setNotice(''); setRemoved(null); setDialog(null); setDetailProduct(null);
    });
    return () => {cancelAnimationFrame(frame); request.current?.abort();};
  }, [storageKey]);

  function save(nextInventory: PantryItem[], nextBasket = basket) {
    try {localStorage.setItem(storageKey, JSON.stringify({inventory: nextInventory, basket: nextBasket}));}
    catch {setNotice('브라우저 저장 공간을 사용할 수 없어 이번 화면에서만 유지돼요.');}
  }
  function updateInventory(next: PantryItem[]) {
    setInventory(next); save(next); setResult(null); setError('');
  }
  function addIngredients(names: string[], source?: PhotoSource) {
    const next = mergePantryEntries(inventory, names.map(name => ({name})), source === 'cart', today);
    updateInventory(next);
    setNotice(source === 'cart' ? '구매 예정에 담았어요. 재료 관리에서 구매 완료로 바꿀 수 있어요.' : '내 주방에 담았어요. 이제 메뉴를 골라볼까요?');
  }
  function addText() {
    const entries = parsePantryEntry(extra);
    if (!entries.length) {setNotice('재료 이름을 한글로 입력해 주세요. 여러 재료는 쉼표로 나눠주세요.'); return;}
    updateInventory(mergePantryEntries(inventory, entries, false, today));
    setExtra(''); setNotice('재료를 담았어요. 더 적거나 바로 추천받을 수 있어요.'); input.current?.focus();
  }
  function editItem(id: string, patch: Partial<PantryItem>) {
    updateInventory(inventory.map(item => item.id === id ? {...item, ...patch} : item));
  }
  function removeItem(item: PantryItem) {
    updateInventory(inventory.filter(other => other.id !== item.id)); setRemoved(item);
  }
  function togglePriority(name: string) {
    const selected = inventory.some(item => !item.planned && item.name === name && item.useSoon);
    updateInventory(inventory.map(item => !item.planned && item.name === name ? {...item, useSoon: !selected} : item));
  }
  function focusHeading() {requestAnimationFrame(() => {heading.current?.focus({preventScroll: true}); heading.current?.scrollIntoView({block: 'start'});});}
  function returnHome() {setDetailProduct(null); setResult(null); setCooking(false); setCleanup(false); setError(''); setNotice(''); focusHeading();}

  async function recommend(skip = false, override?: RecommendationOverride) {
    if (locked) return;
    const controller = new AbortController(); request.current = controller;
    const choice = mealMoods.find(item => item.id === (override?.mood ?? mood))!;
    setBusy(true); setDetailProduct(null); setError(''); setNotice(''); setCleanup(false); setUsedUp([]);
    try {
      const response = await fetch('/api/shopping-plan/engine', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify({action: 'recommend', pantrySourceRecipes:true, pantry: skip ? [] : override?.owned ?? owned, pantryPriority: priority, pantryChoices: true, pantryAllowShopping: skip || (override?.shopping ?? allowShopping), previous: seen.slice(-60), conditions: {budget: 1000000, budgetUnlimited: true, meals: 1, days: 1, slots: ['dinner'], people: 1, sideCount: 0, mealMode: 'cook', cookingEffort: choice.effort, cooking: 'all', avoid: '', owned: [], goal: choice.goal}}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '추천을 불러오지 못했어요.');
      const products = data.products as PlanProduct[] | undefined;
      if (!products?.length) throw new Error('추천할 메뉴가 없어요.');
      setResult(products[0]); setChoices(products); setMissing(skip ? missingPantryIngredients(products[0], owned) : data.missing ?? []); setSkipped(skip); setCooking(false);
      if (data.repeated) setNotice('지금 조건에 맞는 메뉴를 다시 보여드려요. 재료나 취향을 바꾸면 선택지가 넓어져요.');
      const nextSeen = [...seen, ...products.map(product => product.id)].slice(-60); setSeen(nextSeen);
      try {localStorage.setItem(`${storageKey}-seen`, JSON.stringify(nextSeen));} catch {}
      focusHeading();
    } catch (exception) {
      if (!controller.signal.aborted) {
        setError(exception instanceof Error ? exception.message : '연결을 확인하고 다시 시도해 주세요.');
        requestAnimationFrame(() => {errorPanel.current?.focus({preventScroll: true}); errorPanel.current?.scrollIntoView({block: 'center'});});
      }
    } finally {if (!controller.signal.aborted) setBusy(false);}
  }

  const feedback = <>
    {busy && <p className="pantry-loading" role="status"><span className="pantry-spinner"/>출처 레시피의 재료와 만드는 법을 확인하고 있어요…</p>}
    {error && <section ref={errorPanel} tabIndex={-1} className="pantry-error" role="alert"><strong>메뉴를 찾지 못했어요</strong><p>{error}</p><div className="pantry-error-actions"><button disabled={locked} onClick={() => recommend(result ? skipped : !mainIngredients.length)}>다시 시도</button>
      {basicPantryStaples.some(name => !owned.includes(name)) && <button disabled={locked} onClick={() => {const nextOwned = [...new Set([...owned, ...basicPantryStaples])]; addIngredients(basicPantryStaples); recommend(false, {owned: nextOwned});}}>소금·후추·식용유·간장은 있어요</button>}
      <button disabled={locked} onClick={() => {setAllowShopping(true); recommend(!mainIngredients.length, {shopping: true});}}>추가 장보기 메뉴도 보기</button>
      <button disabled={locked} onClick={() => {setMood('everyday'); recommend(!mainIngredients.length, {mood: 'everyday'});}}>기본 요리까지 넓혀보기</button>
    </div></section>}
    {notice && <p className="pantry-notice" role="status"><Icon name="check" size={16}/>{notice}</p>}
  </>;

  return <section className="pantry-home">
    <header className="pantry-hero">
      {result ? <button className="pantry-back" disabled={locked} onClick={returnHome}><Icon name="left" size={16}/>내 주방으로</button> : <span className="pantry-eyebrow">있는 재료로, 나를 위한 한 끼</span>}
      <h1 ref={heading} tabIndex={-1}>{result ? '오늘은 이거 어때요?' : '오늘 뭐 해 먹을까요?'}</h1>
      <p>{result ? '메뉴를 골라 재료와 만드는 법을 확인해 보세요.' : '냉장고 속 재료 몇 개면 시작할 수 있어요.'}</p>
    </header>

    {!result && <div className="pantry-home-grid">
      <section className="pantry-kitchen" aria-labelledby="pantry-kitchen-title">
        <div className="pantry-section-heading"><h2 id="pantry-kitchen-title">내 주방 <span className="pantry-count">{ready ? owned.length : '…'}</span></h2><button className="pantry-text-button" disabled={locked} onClick={() => setDialog('manage')}>재료 관리<Icon name="chevron" size={14}/></button></div>
        {!ready ? <div className="pantry-empty" role="status">내 재료를 불러오는 중…</div> : mainIngredients.length ? <>
          <div className="pantry-owned-list" aria-label="먼저 쓸 재료 선택">{mainIngredients.slice(0, 8).map(name => <button key={name} aria-pressed={inventory.some(item => item.name === name && !item.planned && item.useSoon)} disabled={locked} onClick={() => togglePriority(name)}>{label(name)}{inventory.some(item => item.name === name && !item.planned && item.useSoon) && <Icon name="check" size={13}/>}</button>)}{mainIngredients.length > 8 && <button disabled={locked} onClick={() => setDialog('manage')}>+{mainIngredients.length - 8}가지</button>}</div>
          <p className="pantry-hint">먼저 쓰고 싶은 재료가 있다면 눌러주세요.</p>
        </> : <div className="pantry-empty"><Icon name="bag" size={28}/><div><strong>지금 있는 재료부터 담아볼까요?</strong><p>전부 적지 않아도 돼요. 생각나는 것부터!</p></div></div>}
        <form className="pantry-add" onSubmit={event => {event.preventDefault(); addText();}}><input ref={input} aria-label="집에 있는 재료" placeholder="계란, 김치, 두부 반 모…" maxLength={1000} value={extra} onChange={event => setExtra(event.target.value)} disabled={locked}/><button type="submit" disabled={locked || !extra.trim()}>추가</button></form>
        <div className="pantry-input-help"><small>여러 재료는 쉼표로 나눠주세요.</small><button className="pantry-text-button" disabled={locked} onClick={() => setDialog('picker')}>목록에서 고르기<Icon name="chevron" size={14}/></button></div>
        <PantryPhotoInput disabled={busy || !ready} userId={userId} onLogin={onLogin} onConfirm={addIngredients} onBusyChange={setPhotoBusy}/>
        <details className="pantry-seasonings"><summary>기본 양념 {seasonings.length ? `${seasonings.length}가지 보유` : '있다면 함께 알려주세요'}<span>선택</span></summary><div className="pantry-chips">{[...new Set([...basicPantryStaples, ...seasonings])].map(name => <button key={name} aria-pressed={seasonings.includes(name)} disabled={locked} onClick={() => seasonings.includes(name) ? updateInventory(inventory.filter(item => item.planned || item.name !== name)) : addIngredients([name])}>{label(name)}{seasonings.includes(name) && ' ✓'}</button>)}<button disabled={locked} onClick={() => setDialog('picker')}>다른 양념 찾기</button></div></details>
        {inventory.some(item => item.planned || (item.expiresOn && item.expiresOn < today)) && <button className="pantry-inventory-alert" disabled={locked} onClick={() => setDialog('manage')}>구매 예정·소비기한 지난 재료 확인<Icon name="chevron" size={16}/></button>}
      </section>

      <section className="pantry-meal-panel" aria-labelledby="pantry-meal-title">
        <div className="pantry-section-heading"><h2 id="pantry-meal-title">오늘은 어떤 한 끼?</h2><span className="pantry-serving">원문 분량</span></div>
        <div className="pantry-moods" aria-label="오늘의 식사 취향">{mealMoods.map(item => <button key={item.id} aria-pressed={mood === item.id} disabled={locked} onClick={() => setMood(item.id)}><strong>{item.label}</strong><small>{item.description}</small>{mood === item.id && <Icon name="check" size={16}/>}</button>)}</div>
        <label className="pantry-shopping-toggle">
          <input type="checkbox" aria-label="재료를 조금 더 사도 괜찮아요" aria-describedby="pantry-shopping-description" checked={allowShopping} disabled={locked} onChange={event => setAllowShopping(event.target.checked)}/>
          <span className="pantry-shopping-check" aria-hidden="true"><Icon name="check" size={15} strokeWidth={2.5}/></span>
          <span className="pantry-shopping-copy"><strong>재료를 조금 더 사도 괜찮아요</strong><small id="pantry-shopping-description">{allowShopping ? '메뉴마다 더 필요한 재료를 알려드려요.' : '등록한 재료로 만들 수 있는 메뉴만 찾아요.'}</small></span>
        </label>
        <div className="pantry-recommend-action"><button className="pantry-primary" disabled={locked} onClick={() => recommend(!mainIngredients.length)}><Icon name="spark" size={18}/>{busy ? '메뉴 찾는 중…' : mainIngredients.length ? '이 재료로 메뉴 추천받기' : '메뉴 먼저 둘러보기'}<Icon name="arrow" size={18}/></button>
        <p className="pantry-cta-caption">{mainIngredients.length ? `${mainIngredients.length}가지 주재료${priority.length ? ' · 먼저 쓸 재료 우선' : ''}로 찾아요` : '재료를 추가하면 내 주방에 맞춰 추천해요.'}</p></div>
        {feedback}
      </section>
    </div>}

    {result && <>
      <div className="pantry-result-toolbar"><span>{skipped ? '둘러보는 메뉴' : `${mainIngredients.length}가지 주재료로 찾은 메뉴`} · {mealMoods.find(item => item.id === mood)?.label}</span><button disabled={locked} onClick={() => recommend(skipped)}><Icon name="spark" size={16}/>{busy ? '찾는 중…' : '다른 메뉴 보기'}</button></div>
      {feedback}
      <section className="pantry-options" aria-label="추천 메뉴 선택"><div>{choices.map(product => {
        const shortage = pantryShortage(product, owned);
        const usedPriority = priority.filter(name => product.recipe?.ingredients.some(i => canonicalIngredient(i.product.name) === canonicalIngredient(name)));
        const expanded = detailProduct?.id === product.id;
        const toggleId = `pantry-menu-toggle-${product.id}`, panelId = `pantry-menu-panel-${product.id}`;
        const closeDetails = () => {setDetailProduct(null); requestAnimationFrame(() => document.getElementById(toggleId)?.focus());};
        return <article key={product.id} className="pantry-option" data-selected={result.id === product.id}>
        <button id={toggleId} type="button" disabled={locked} aria-expanded={expanded} aria-controls={panelId} aria-label={`${product.name.replaceAll('_', ' ')} 재료·조리법 ${expanded ? '접기' : '펼치기'}`} onClick={() => setDetailProduct(expanded ? null : product)}>
          <span className="pantry-option-copy"><span className="pantry-option-title"><strong>{product.name.replaceAll('_', ' ')}</strong>{result.id === product.id && <span className="pantry-option-selected"><Icon name="check" size={13}/>선택한 메뉴</span>}</span><span className={shortage.main.length ? 'pantry-shortage' : 'pantry-match'}>{skipped ? '재료 확인하고 만들기' : shortage.main.length ? `더 필요해요: ${shortage.main.map(label).join(' · ')}` : shortage.seasonings.length ? '주재료 준비됨 · 양념 확인' : '재료 종류 일치 · 분량 확인'}</span>{!skipped && shortage.seasonings.length > 0 && <small className="pantry-seasoning-shortage">양념 확인: {shortage.seasonings.map(label).join(' · ')}</small>}{!skipped && usedPriority.length > 0 && <span className="pantry-match">먼저 쓸 {usedPriority.map(label).join('·')} 활용</span>}<small>{product.sourceRecipe?.video.channel} · 출처 레시피 기준</small><span className="pantry-option-view">{expanded ? '상세정보 접기' : '재료·조리법 펼치기'}<Icon name="chevron" size={15}/></span></span>
        </button>
        <div id={panelId} role="region" aria-labelledby={toggleId} hidden={!expanded}>{expanded && <PantryMenuDetails product={product} owned={owned} onClose={closeDetails} onSelect={() => {setResult(product); setMissing(missingPantryIngredients(product, owned)); setCooking(true); setCleanup(false); setUsedUp([]); setDetailProduct(null); requestAnimationFrame(() => {recipe.current?.focus({preventScroll:true}); recipe.current?.scrollIntoView({block:'start'});});}}/>}</div>
        </article>;
      })}</div></section>
      <article className="pantry-result">
        <div className="pantry-result-body"><div className="pantry-section-heading"><div><span className="pantry-eyebrow">{cooking ? '오늘 내가 고른 한 끼' : '추천한 한 끼'}</span><h2>{result.name.replaceAll('_', ' ')}</h2></div><span className="pantry-serving">원문 분량</span></div>
          <button type="button" className="pantry-text-button" disabled={locked} aria-expanded={detailProduct?.id === result.id} aria-controls={`pantry-menu-panel-${result.id}`} onClick={() => {setDetailProduct(result); requestAnimationFrame(() => {const toggle = document.getElementById(`pantry-menu-toggle-${result.id}`); toggle?.focus({preventScroll:true}); toggle?.scrollIntoView({block:'start'});});}}>재료·조리법 보기<Icon name="chevron" size={15}/></button>
          {missing.length > 0 ? <section className="pantry-needed" aria-label="이 메뉴에 더 필요한 재료">
            <div className="pantry-needed-heading"><Icon name="bag" size={18}/><strong>추가로 필요한 재료</strong><span>{missing.length}가지</span></div>
            {([false, true] as const).map(seasoning => {
              const names = missing.filter(name => isPantrySeasoning(name) === seasoning);
              return names.length > 0 && <div className="pantry-needed-group" key={String(seasoning)}><span>{seasoning ? '양념도 확인해 주세요' : '장볼 때 챙겨주세요'}</span><ul>{names.map(name => <li key={name}>{result.recipe?.ingredients.find(item => canonicalIngredient(item.product.name) === name)?.label.replace(' (기본 양념)', '') || label(name)}</li>)}</ul></div>;
            })}
            <p>등록한 재료 기준이에요. 이미 집에 있는 재료는 구매하지 않아도 돼요.</p>
          </section> : <p className="pantry-match">{skipped ? '만들기 전에 필요한 재료를 확인해 주세요.' : '출처 레시피의 재료 종류가 맞아요. 필요한 양은 아래에서 확인해 주세요.'}</p>}
          {!result.sourceRecipe && pantryOptionalIngredients(result, owned).length > 0 && !skipped && <p className="pantry-muted">{pantryOptionalIngredients(result, owned).map(label).join('·')}는 생략할 수 있어요. 맛과 식감은 달라질 수 있고, 영양정보는 원본 기준이에요.</p>}
          <div className="pantry-actions"><button className="pantry-primary" disabled={locked} onClick={() => {setCooking(true); requestAnimationFrame(() => {recipe.current?.focus({preventScroll: true}); recipe.current?.scrollIntoView({block: 'start'});});}}>{cooking ? '만드는 법으로 이동' : '이 메뉴 만들기'}<Icon name="arrow" size={18}/></button>{missing.length > 0 && <button disabled={locked} onClick={() => {const next = [...new Set([...basket, ...missing])]; setBasket(next); save(inventory, next); setNotice('부족한 재료를 장보기 목록에 담았어요.');}}><Icon name="bag" size={17}/>장보기 담기</button>}</div>
          {cooking && <section ref={recipe} tabIndex={-1} className="pantry-recipe"><PantryCookingGuide key={result.id} product={result}/>
            {!cleanup && <button className="pantry-primary" disabled={locked} onClick={() => {setCleanup(true); setUsedUp([]);}}>다 만들었어요<Icon name="check" size={18}/></button>}
            {cleanup && <section className="pantry-cleanup"><h3>다 쓴 재료가 있나요?</h3><p className="pantry-muted">전부 남아 있다면 그대로 완료해도 돼요.</p>{inventory.filter(item => !item.planned && !isPantrySeasoning(item.name) && owned.includes(item.name) && result.recipe?.ingredients.some(ingredient => canonicalIngredient(ingredient.product.name) === item.name)).map(item => <label key={item.id}><input type="checkbox" checked={usedUp.includes(item.id)} onChange={event => setUsedUp(ids => event.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))}/>{label(item.name)}{item.quantity ? ` · ${item.quantity}` : ''}</label>)}<button className="pantry-primary" onClick={() => {updateInventory(inventory.filter(item => !usedUp.includes(item.id))); setCooking(false); setCleanup(false); setNotice(usedUp.length ? '다 쓴 재료를 정리했어요. 다음 한 끼에도 남은 재료를 활용해요.' : '맛있게 드세요! 남은 재료는 그대로 보관했어요.'); focusHeading();}}>{usedUp.length ? `${usedUp.length}가지 정리하고 완료` : '재료 유지하고 완료'}</button></section>}
          </section>}
        </div>
      </article>
      <button className="pantry-skip" disabled={locked} onClick={returnHome}>재료·취향 바꿔서 다시 찾기<Icon name="left" size={14}/></button>
    </>}

    {basket.length > 0 && <details className="pantry-shopping"><summary><Icon name="bag" size={17}/>다음 장보기 <span>{basket.length}가지</span></summary><ul>{basket.map(name => <li key={name}><span>{label(name)}</span><a href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer">상품 찾기 ↗</a><button aria-label={`${name} 장보기에서 삭제`} onClick={() => {const next = basket.filter(value => value !== name); setBasket(next); save(inventory, next);}}><Icon name="close" size={16}/></button></li>)}</ul></details>}
    {!result && <p className="pantry-storage-note">재료와 조리법을 대조한 레시피부터 추천해요. 내 재료는 이 브라우저에 저장돼요.</p>}

    {dialog === 'picker' && <PantryDialog title="집에 있는 재료 고르기" onClose={() => setDialog(null)}><PantryIngredientPicker owned={owned} onAdd={addIngredients} onClose={() => setDialog(null)}/></PantryDialog>}
    {dialog === 'manage' && <PantryDialog title="내 재료 관리" onClose={() => {setDialog(null); setRemoved(null);}}><div className="pantry-dialog-body"><p className="pantry-muted">다 쓴 재료는 빼고, 남은 재료는 먼저 쓰도록 표시해요.</p>
      {removed && <div className="pantry-undo" role="status">{label(removed.name)} 삭제됨<button onClick={() => {updateInventory([...inventory, removed]); setRemoved(null);}}>되돌리기</button></div>}
      {!inventory.length && <p className="pantry-empty">아직 등록한 재료가 없어요.</p>}
      {inventory.map(item => <article className="pantry-inventory-item" key={item.id}><header><div><strong>{label(item.name)}</strong><small>{item.planned ? '구매 예정' : item.expiresOn && item.expiresOn < today ? '소비기한 지남 · 추천 제외' : item.quantity || '보유 중'}</small></div><button className="pantry-icon-button" onClick={() => removeItem(item)} aria-label={`${label(item.name)} 재료 삭제`}><Icon name="close" size={17}/></button></header>
        {item.planned ? <button className="pantry-text-button" onClick={() => editItem(item.id, {planned: false, purchasedOn: today})}>구매했어요 · 내 주방에 넣기</button> : (!item.expiresOn || item.expiresOn >= today) && !isPantrySeasoning(item.name) && <button className="pantry-priority-button" aria-pressed={item.useSoon === true} onClick={() => editItem(item.id, {useSoon: !item.useSoon})}>{item.useSoon ? '✓ 먼저 쓸 재료' : '먼저 쓰기'}</button>}
        <details><summary>수량·날짜 메모 <span>선택</span></summary><div className="pantry-inventory-fields"><label>수량<input maxLength={40} placeholder="예: 2개, 반 모" value={item.quantity} onChange={event => editItem(item.id, {quantity: event.target.value})}/></label><label>구매일<input type="date" value={item.purchasedOn} max={today} onChange={event => editItem(item.id, {purchasedOn: event.target.value})}/></label><label>소비기한<input type="date" value={item.expiresOn} onChange={event => editItem(item.id, {expiresOn: event.target.value})}/></label><label className="pantry-opened"><input type="checkbox" checked={item.opened} onChange={event => editItem(item.id, {opened: event.target.checked})}/>개봉했어요</label></div><small>포장 안내와 보관 상태를 확인해 주세요.</small></details>
      </article>)}
    </div><footer className="pantry-dialog-footer"><button className="pantry-primary" onClick={() => {setDialog(null); setRemoved(null);}}>완료</button></footer></PantryDialog>}
  </section>;
}
