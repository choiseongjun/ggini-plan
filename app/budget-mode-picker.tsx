import {budgetModes,type BudgetMode} from '../lib/shopping-goals';
import styles from './shopping-goal-picker.module.css';
export function BudgetModePicker({value='balanced',onChange,disabled}:{value?:BudgetMode;onChange:(mode:BudgetMode)=>void;disabled?:boolean}){
 return <fieldset className={styles.picker} disabled={disabled}><legend>예산을 어떻게 사용할까요?</legend><div className={styles.options}>{(Object.keys(budgetModes) as BudgetMode[]).map(mode=><label key={mode} className={value===mode?styles.selected:undefined}><input type="radio" name="budget-mode" checked={value===mode} onChange={()=>onChange(mode)}/><span><strong>{budgetModes[mode].label}</strong><small>{budgetModes[mode].description}</small></span></label>)}</div><p className={styles.note}>모든 방식에서 입력한 한도를 지켜요. 예산을 활용해도 필요 없는 수량을 추가하지 않아요. 배송비는 별도예요.</p></fieldset>;
}
