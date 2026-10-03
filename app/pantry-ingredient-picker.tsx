'use client';
import {useEffect, useState} from 'react';
import {ingredientGroups} from '../lib/pantry-ingredient-browser';
import {canonicalIngredient} from '../lib/ingredient-canonical';
import {Icon} from './app-shell';

export function PantryIngredientPicker({owned, onAdd, onClose}: {owned: string[]; onAdd: (names: string[]) => void; onClose: () => void}) {
  const [query, setQuery] = useState(''), [group, setGroup] = useState('전체');
  const [items, setItems] = useState<{name: string; group: string; recipeCount: number}[]>([]);
  const [total, setTotal] = useState(0), [busy, setBusy] = useState(true), [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/pantry/ingredients?q=${encodeURIComponent(query)}&group=${encodeURIComponent(group)}`, {signal: controller.signal})
        .then(async response => {const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;})
        .then(data => {if (!controller.signal.aborted) {setItems(data.items); setTotal(data.total);}})
        .catch(exception => {if (!controller.signal.aborted) setError(exception.message ?? '재료 목록을 불러오지 못했어요.');})
        .finally(() => {if (!controller.signal.aborted) setBusy(false);});
    }, 200);
    return () => {clearTimeout(timer); controller.abort();};
  }, [query, group, retry]);
  function refresh() {setBusy(true); setError('');}
  function toggle(name: string) {setSelected(names => names.includes(name) ? names.filter(item => item !== name) : [...names, name]);}
  const customName = canonicalIngredient(query);
  const canAddCustom = customName && !owned.includes(customName) && !selected.includes(customName) && !items.some(item => item.name === customName);
  return <>
    <div className="pantry-picker-search"><input data-autofocus className="pantry-search" aria-label="전체 재료 검색" placeholder="재료 검색 · 예: 참치, 버섯, 파스타" maxLength={50} value={query} onChange={event => {setQuery(event.target.value); refresh();}}/>{query && <button aria-label="검색어 지우기" onClick={() => {setQuery(''); refresh();}}><Icon name="close" size={16}/></button>}</div>
    <div className="pantry-chips pantry-group-tabs" aria-label="재료 분류">{ingredientGroups.map(value => <button key={value} aria-pressed={group === value} onClick={() => {if (group !== value) {setGroup(value); refresh();}}}>{value}</button>)}</div>
    <div className="pantry-dialog-body pantry-picker-body">
      <p className="pantry-hint" role="status">{busy ? '재료를 찾고 있어요…' : error ? '목록을 불러오지 못했어요.' : query ? `검색 결과 ${total}가지` : '집에 있는 재료를 모두 골라주세요.'}</p>
      {error && <div className="pantry-error" role="alert"><p>{error}</p><button onClick={() => {refresh(); setRetry(value => value + 1);}}>다시 불러오기</button></div>}
      <div className="pantry-picker-list" aria-busy={busy}>{!busy && !error && items.map(item => <button key={item.name} disabled={owned.includes(item.name)} aria-pressed={owned.includes(item.name) || selected.includes(item.name)} onClick={() => toggle(item.name)}>{item.name === '달걀' ? '계란' : item.name}<span>{owned.includes(item.name) ? '보유' : selected.includes(item.name) ? <Icon name="check" size={15}/> : '+'}</span></button>)}</div>
      {!busy && canAddCustom && <button className="pantry-custom-add" onClick={() => toggle(customName)}>“{query.trim()}” 직접 추가하기 +</button>}
      {!busy && !items.length && !error && !canAddCustom && <p className="pantry-muted">다른 이름이나 분류로 찾아보세요.</p>}
      {!busy && !error && total > 80 && <p className="pantry-hint">자주 쓰이는 80가지부터 보여드려요. 검색으로 더 찾아보세요.</p>}
    </div>
    <footer className="pantry-dialog-footer">
      {selected.length > 0 && <div className="pantry-selected-chips" aria-label="선택한 재료">{selected.map(name => <button key={name} aria-label={`${name} 선택 취소`} onClick={() => toggle(name)}>{name === '달걀' ? '계란' : name}<Icon name="close" size={12}/></button>)}</div>}
      <button className="pantry-primary" disabled={!selected.length} onClick={() => {onAdd(selected); onClose();}}>{selected.length ? `${selected.length}가지 내 주방에 추가` : '집에 있는 재료를 골라주세요'}</button>
    </footer>
  </>;
}
