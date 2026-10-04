import './meal-input-methods.css';
export function MealInputMethods({selected,disabled,onSelect}:{selected?:'photo'|'manual';disabled:boolean;onSelect:(mode:'photo'|'manual')=>void}){
 return <div className="meal-input-methods" role="group" aria-label="메뉴 추가 방법">{(['photo','manual'] as const).map(mode=><button type="button" key={mode} disabled={disabled} aria-pressed={selected===undefined?undefined:selected===mode} onClick={()=>onSelect(mode)}>
 <span className="meal-input-method-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{mode==='photo'?<><path d="M8 6 10 3h4l2 3h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="3.5"/></>:<><path d="m5 16-1 4 4-1L20 7a2.1 2.1 0 0 0-3-3L5 16ZM14 7l3 3M12 20h8"/></>}</svg></span>
 <span className="meal-input-method-copy"><strong>{mode==='photo'?'사진으로 추가':'직접 입력'}</strong><small>{mode==='photo'?'AI가 음식 이름을 찾아요':'메뉴 이름만 적으면 돼요'}</small></span>
 {selected===mode&&<span className="meal-input-method-check" aria-hidden="true">✓</span>}
 </button>)}</div>;
}
