import type { PlanConditions } from '../lib/shopping-plan';
import styles from './meal-mode-picker.module.css';

type Choice = 'quick' | 'ready' | 'cook' | 'mixed';
const options: { value: Choice; label: string; description: string }[] = [
  { value: 'quick', label: '간편 조리', description: '데우거나 볶아서 간단히' },
  { value: 'ready', label: '밀키트도 OK', description: '간편식부터 밀키트까지' },
  { value: 'cook', label: '직접 요리', description: '장보기 재료와 조리법까지' },
  { value: 'mixed', label: '골고루', description: '간편식과 직접 요리를 함께' },
];

export function MealModePicker({ conditions, simple = false, disabled, onChange }: {
  conditions: PlanConditions;
  simple?: boolean;
  disabled: boolean;
  onChange: (value: Partial<PlanConditions>) => void;
}) {
  const selected = simple
    ? conditions.mealMode === 'cook' ? 'cook' : conditions.mealMode === 'ready' ? conditions.cooking === 'quick' ? 'quick' : 'ready' : 'mixed'
    : conditions.mealMode ?? 'ready';

  function select(value: Choice) {
    if (!simple) {
      onChange({ mealMode: value as PlanConditions['mealMode'] });
      return;
    }
    onChange({ mealMode: value === 'quick' ? 'ready' : value, cooking: value === 'quick' ? 'quick' : 'all' });
  }

  return <fieldset className={styles.picker} disabled={disabled}>
    <legend>{simple && <span className="planner-step">3</span>} 어떻게 먹을까요?</legend>
    <div className={`${styles.options} ${simple ? '' : styles.detailed}`}>
      {options.filter(option => simple || option.value !== 'quick').map(option => <button
        key={option.value}
        type="button"
        aria-pressed={selected === option.value}
        onClick={() => select(option.value)}
      ><span>{!simple && option.value === 'ready' ? '간편식 위주' : option.label}</span><span className={styles.description}>{option.description}</span></button>)}
    </div>
  </fieldset>;
}
