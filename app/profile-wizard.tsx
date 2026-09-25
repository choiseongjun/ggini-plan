"use client";

import { useEffect, useId, useRef } from "react";
import { activities, calorieEstimate, parseBodyProfile, type BodyProfile } from "../lib/body-profile";
import { dietStyles, excludedFoods, excludedFoodGroups, type DietPreferences } from "../lib/meal-plan";
import { healthFlags, type HealthFlag } from "../lib/today-context";
import { bmi, bodyGoals, nutritionPlan, type BodyGoal } from "../lib/nutrition-plan";
import type { NutritionTarget } from "../lib/nutrition-target";
import { ProfileIcon, type ProfileIconName } from "./profile-icons";
import "./profile-wizard.css";

export type WizardResult = { profile: BodyProfile; diet: DietPreferences; target: NutritionTarget | null; goal: BodyGoal | "" };
export type CustomTarget = { mealCalories: number[]; proteinRatio: number; fatRatio: number };
export type ProfileFields = { sex: string; age: string; height: string; weight: string; activity: string; meals: string; pregnancy: boolean; diet: DietPreferences; goal: BodyGoal | ""; custom: CustomTarget | null };

const steps = [
  { title: "기본 정보", question: "나에 대해 알려주세요", icon: "face", tone: "peach" },
  { title: "키·체중", question: "지금 몸 상태는요?", icon: "scale", tone: "sky" },
  { title: "활동량", question: "평소에 얼마나 움직이나요?", icon: "sneaker", tone: "lemon" },
  { title: "목표", question: "어떤 목표를 갖고 있나요?", icon: "flag", tone: "pink" },
  { title: "식사", question: "어떻게 먹고 싶나요?", icon: "bowl", tone: "mint" },
  { title: "칼로리·탄단지", question: "하루 칼로리와 탄단지를 정해요", icon: "flame", tone: "peach" },
  { title: "못 먹는 재료", question: "빼고 싶은 재료가 있나요?", icon: "nope", tone: "lilac" },
  { title: "결과", question: "나에게 맞는 하루 영양이에요", icon: "face", tone: "mint" },
] as const satisfies readonly { title: string; question: string; icon: ProfileIconName; tone: string }[];
export const sectionCount = steps.length - 1;
const n = (value: number) => value.toLocaleString("ko-KR");
const mealLabelSets: Record<number, string[]> = { 1: ["하루 한 끼"], 2: ["첫 끼", "두 번째 끼"], 3: ["아침", "점심", "저녁"], 4: ["아침", "점심", "간식", "저녁"], 5: ["아침", "오전 간식", "점심", "오후 간식", "저녁"], 6: ["아침", "오전 간식", "점심", "오후 간식", "저녁", "야식"] };
export const mealLabels = (count: number) => mealLabelSets[count] ?? Array.from({ length: count }, (_, i) => `${i + 1}번째 끼`);
const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);
// Splits a daily total into meals in 10 kcal steps; three meals lean slightly toward lunch/dinner.
export function splitCalories(total: number, count: number, weights?: number[]) {
  const w = weights && weights.length === count && sum(weights) > 0 ? weights : count === 3 ? [30, 35, 35] : Array(count).fill(1);
  const parts = w.map(x => Math.round(total * x / sum(w) / 10) * 10);
  parts[parts.length - 1] += total - sum(parts);
  return parts;
}
// The target actually saved: the user's own numbers if they set them, otherwise the goal-based calculation.
export function effectiveTarget(f: ProfileFields, plan: ReturnType<typeof nutritionPlan>): NutritionTarget | null {
  if (f.custom) { const calories = sum(f.custom.mealCalories); return { calories, carbRatio: 100 - f.custom.proteinRatio - f.custom.fatRatio, proteinRatio: f.custom.proteinRatio, fatRatio: f.custom.fatRatio, mealCalories: f.custom.mealCalories }; }
  return plan?.target ?? null;
}
const goalLook: Record<BodyGoal, { icon: ProfileIconName; tone: string }> = { lose: { icon: "leaf", tone: "mint" }, maintain: { icon: "balance", tone: "sky" }, muscle: { icon: "bolt", tone: "peach" } };

export function readFields(f: ProfileFields) {
  const age = Number(f.age), height = Number(f.height), weight = Number(f.weight);
  const ageOk = Number.isInteger(age) && age >= 19 && age <= 78;
  const heightOk = height >= 100 && height <= 250, weightOk = weight >= 30 && weight <= 350;
  const profile = parseBodyProfile({ height, weight, age, sex: f.sex, activity: f.activity, meals: Number(f.meals), pregnancy: f.pregnancy });
  const plan = profile && f.goal ? nutritionPlan(profile, f.goal) : null;
  const body = heightOk && weightOk ? bmi({ height, weight }) : null;
  const target = f.pregnancy ? null : effectiveTarget(f, plan);
  const customOk = !f.custom || (sum(f.custom.mealCalories) >= 800 && sum(f.custom.mealCalories) <= 6000);
  const estimate = profile ? calorieEstimate(profile) : null;
  return { ageOk, heightOk, weightOk, profile, plan, body, target, customOk, estimate };
}

// Which of the sections are filled; meals/exclusions have defaults, so they count once saved or reviewed.
export function sectionStatus(f: ProfileFields, reviewed: Set<number>, saved: boolean) {
  const { ageOk, heightOk, weightOk, body } = readFields(f);
  const done = [Boolean(f.sex) && ageOk, heightOk && weightOk, Boolean(f.activity), Boolean(f.goal) || f.pregnancy, saved || reviewed.has(4), Boolean(f.custom) || saved || reviewed.has(5), saved || reviewed.has(6)];
  const summary = [
    done[0] ? `${f.sex === "female" ? "여성" : "남성"} · 만 ${f.age}세` : "성별·나이",
    done[1] ? `${f.height}cm · ${f.weight}kg${body ? ` · BMI ${body.value}` : ""}` : "키·체중·BMI",
    f.activity ? activities[f.activity as BodyProfile["activity"]].label : "평소 활동량",
    f.goal ? bodyGoals[f.goal].label : f.pregnancy ? "임신·수유 중" : "감량·유지·근육",
    `하루 ${f.meals}끼 · ${dietStyles[f.diet.style]}`,
    f.custom ? `직접 · ${n(sum(f.custom.mealCalories))}kcal · 탄${100 - f.custom.proteinRatio - f.custom.fatRatio} 단${f.custom.proteinRatio} 지${f.custom.fatRatio}` : f.pregnancy ? "자동 계산 안 함" : "목표에 맞춰 자동",
    f.diet.excluded.length ? f.diet.excluded.map(k => excludedFoods[k]).slice(0, 3).join(", ") + (f.diet.excluded.length > 3 ? ` 외 ${f.diet.excluded.length - 3}개` : "") : "없음",
  ];
  return { done, summary, percent: Math.round(done.filter(Boolean).length / done.length * 100) };
}

export function ProfileProgress({ fields, reviewed, saved, onOpen }: { fields: ProfileFields; reviewed: Set<number>; saved: boolean; onOpen: (step: number) => void }) {
  const { done, summary } = sectionStatus(fields, reviewed, saved);
  const missing = done.filter(d => !d).length;
  return <section className="profile-progress" aria-label="내 정보 완성도">
    <div className="progress-head"><div><span className="wizard-kicker">내 정보</span><h3>{missing ? `${missing}개만 더 알려주세요` : "카드를 눌러 언제든 바꿀 수 있어요"}</h3></div></div>
    <ul className="progress-sections">{steps.slice(0, sectionCount).map((s, i) => <li key={s.title}>
      <button type="button" className={`tone-${s.tone}${done[i] ? " is-done" : ""}`} onClick={() => onOpen(i)} aria-label={`${s.title} · ${done[i] ? `${summary[i]} · 수정하기` : "입력하기"}`}>
        <span className="section-icon"><ProfileIcon name={s.icon} />{done[i] && <i className="section-check"><svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2.8 6.2 2.1 2.1 4.3-4.6" /></svg></i>}</span>
        <span className="section-copy"><strong>{s.title}</strong><small>{summary[i]}</small></span>
        {done[i] ? <span className="section-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m9.5 6 6 6-6 6" /></svg></span> : <span className="section-state" aria-hidden="true">입력하기</span>}
      </button>
    </li>)}</ul>
    {missing > 0 && <button type="button" className="wizard-next progress-cta" onClick={() => onOpen(done.findIndex(d => !d))}>남은 {missing}개 입력하기</button>}
  </section>;
}

// 처음 입력할 땐 필수 4단계(기본 정보·키·체중·활동량·목표)만 거쳐 바로 결과로 — 식사·칼로리·못 먹는 재료는 나중에.
const QUICK_SKIP = new Set([4, 5, 6]);

export function ProfileWizardModal({ step, direction, fields, userId, saving, error, quick = false, onStep, onChange, onReviewed, onClose, onSave }: {
  step: number | null; direction: 1 | -1; fields: ProfileFields; userId?: string; saving: boolean; error: string; quick?: boolean;
  onStep: (step: number) => void; onChange: (patch: Partial<ProfileFields>) => void; onReviewed: (step: number) => void; onClose: () => void; onSave: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = step !== null;
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.body.style.overflow;
    node.showModal(); document.body.style.overflow = "hidden";
    return () => { node.close(); document.body.style.overflow = previous; };
  }, [open]);
  const { ageOk, heightOk, weightOk, profile, plan, body, target, customOk, estimate } = readFields(fields);
  const current = step ?? 0;
  const ready = [Boolean(fields.sex) && ageOk, heightOk && weightOk, Boolean(fields.activity), Boolean(fields.goal) || fields.pregnancy, true, customOk, true, Boolean(profile) && customOk][current];
  const mealCount = Number(fields.meals) || 3;
  const labels = mealLabels(mealCount);
  const { custom } = fields;
  function startCustom() {
    const base = plan?.target ?? { calories: estimate?.daily ?? 2000, carbRatio: 50, proteinRatio: 25, fatRatio: 25 };
    onChange({ custom: { mealCalories: splitCalories(Math.round(base.calories / 10) * 10, mealCount), proteinRatio: base.proteinRatio, fatRatio: base.fatRatio } });
  }
  const setCustom = (patch: Partial<CustomTarget>) => { if (custom) onChange({ custom: { ...custom, ...patch } }); };
  const setTotal = (total: number) => { if (custom) setCustom({ mealCalories: splitCalories(Math.max(0, Math.round(total / 10) * 10), mealCount, custom.mealCalories) }); };
  const setMeal = (index: number, value: number) => { if (custom) setCustom({ mealCalories: custom.mealCalories.map((v, i) => i === index ? Math.max(0, Math.min(3000, Math.round(value) || 0)) : v) }); };
  // Protein and fat are set directly; carbs take the remainder so the three always add up to 100%.
  const setRatio = (key: "proteinRatio" | "fatRatio", delta: number) => {
    if (!custom) return;
    const other = key === "proteinRatio" ? custom.fatRatio : custom.proteinRatio;
    const value = Math.max(10, Math.min(60, custom[key] + delta));
    if (value + other <= 90) setCustom({ [key]: value });
  };
  const shown = target ?? plan?.target ?? null;
  const shownMeals = shown?.mealCalories ?? (shown ? splitCalories(shown.calories, mealCount) : []);
  const { diet } = fields;
  const move = (from: number, delta: 1 | -1) => { let n = from + delta; while (quick && QUICK_SKIP.has(n)) n += delta; return n; };
  const next = () => { onReviewed(current); onStep(move(current, 1)); };
  const visibleSteps = steps.map((_, i) => i).filter(i => !quick || !QUICK_SKIP.has(i));

  return <dialog ref={dialog} className="profile-wizard" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    {open && <div className="wizard-sheet">
      <header className="wizard-head">
        <div className="wizard-head-row"><span className="wizard-kicker">{visibleSteps.indexOf(current) + 1} / {visibleSteps.length} · {steps[current].title}</span><button type="button" className="wizard-close" aria-label="닫기" onClick={onClose}>✕</button></div>
        <h3 id={titleId}>{steps[current].question}</h3>
        <div className="wizard-dots" aria-hidden="true">{visibleSteps.map(i => <button type="button" tabIndex={-1} key={steps[i].title} className={i === current ? "is-current" : i < current ? "is-past" : undefined} onClick={() => onStep(i)} />)}</div>
      </header>

      {!fields.pregnancy&&(shown||estimate)&&<div className="wizard-target-summary"><span>하루 목표 칼로리<br/><strong>{n(shown?.calories??estimate!.daily)} kcal</strong></span>{!quick&&current!==5&&<button type="button" onClick={()=>onStep(5)}>칼로리·탄단지 수정</button>}</div>}
      <div key={current} className={`wizard-step ${direction === 1 ? "from-right" : "from-left"}`}>
        {current === 0 && <>
          <span className="wizard-label">계산식 기준 성별</span>
          <div className="wizard-options two">{([["female", "여성", "female", "peach"], ["male", "남성", "male", "sky"]] as const).map(([key, label, icon, tone]) => <button type="button" key={key} aria-pressed={fields.sex === key} onClick={() => onChange({ sex: key, pregnancy: key === "male" ? false : fields.pregnancy })}><span className={`option-icon tone-${tone}`}><ProfileIcon name={icon} size={26} /></span><strong>{label}</strong></button>)}</div>
          <label className="wizard-field">만 나이<div><input type="number" inputMode="numeric" min={19} max={78} placeholder="28" value={fields.age} onChange={e => onChange({ age: e.target.value })} /><span>세</span></div></label>
          {fields.age && !ageOk && <p className="wizard-warn">만 19~78세 성인 기준으로 계산해요.</p>}
        </>}

        {current === 1 && <>
          <div className="wizard-pair">
            <label className="wizard-field">키<div><input type="number" inputMode="decimal" min={100} max={250} step={0.1} placeholder="165" value={fields.height} onChange={e => onChange({ height: e.target.value })} /><span>cm</span></div></label>
            <label className="wizard-field">현재 체중<div><input type="number" inputMode="decimal" min={30} max={350} step={0.1} placeholder="60" value={fields.weight} onChange={e => onChange({ weight: e.target.value })} /><span>kg</span></div></label>
          </div>
          {body && <div className="wizard-bmi" aria-live="polite"><span>BMI</span><strong>{body.value}</strong><em>{body.label}</em><div className="wizard-bmi-bar"><i style={{ left: `${Math.min(100, Math.max(0, (body.value - 15) / 20 * 100))}%` }} /></div><small>대한비만학회 기준 참고값이에요. 근육량은 반영되지 않아요.</small></div>}
        </>}

        {current === 2 && <div className="wizard-options list">{(Object.entries(activities) as [BodyProfile["activity"], (typeof activities)[BodyProfile["activity"]]][]).map(([key, value], i) => <button type="button" key={key} aria-pressed={fields.activity === key} onClick={() => onChange({ activity: key })}><span className={`option-icon tone-${(["lilac", "mint", "lemon", "peach"] as const)[i]}`}><ProfileIcon name={(["sofa", "walk", "run", "dumbbell"] as const)[i]} /></span><strong>{value.label}</strong></button>)}</div>}

        {current === 3 && <>
          <div className="wizard-options list">{(Object.entries(bodyGoals) as [BodyGoal, (typeof bodyGoals)[BodyGoal]][]).map(([key, value]) => <button type="button" key={key} aria-pressed={fields.goal === key} onClick={() => onChange({ goal: key })}><span className={`option-icon tone-${goalLook[key].tone}`}><ProfileIcon name={goalLook[key].icon} /></span><strong>{value.label}</strong><small>{value.description}</small></button>)}</div>
          {fields.sex === "female" && <label className="wizard-check"><input type="checkbox" checked={fields.pregnancy} onChange={e => onChange({ pregnancy: e.target.checked })} />임신 또는 수유 중이에요</label>}
        </>}

        {current === 4 && <>
          <span className="wizard-label">하루 식사 횟수</span>
          <div className="wizard-options chips">{[1, 2, 3, 4, 5, 6].map(count => <button type="button" key={count} aria-pressed={fields.meals === String(count)} onClick={() => onChange({ meals: String(count) })}><strong>{count}끼</strong></button>)}</div>
          <span className="wizard-label">좋아하는 식단</span>
          <div className="wizard-options two">{(Object.entries(dietStyles) as [DietPreferences["style"], string][]).map(([key, label], i) => <button type="button" key={key} aria-pressed={diet.style === key} onClick={() => onChange({ diet: { ...diet, style: key } })}><span className={`option-icon tone-${(["mint", "peach", "lemon", "sky"] as const)[i]}`}><ProfileIcon name={(["bowl", "egg", "sprout", "timer"] as const)[i]} size={26} /></span><strong>{label}</strong></button>)}</div>
        </>}

        {current === 5 && <>
          {fields.pregnancy ? <p className="wizard-note">임신·수유 중에는 개인별 영양 상담이 필요해 칼로리·탄단지 목표를 정하지 않아요. 다음으로 넘어가 주세요.</p> : <>
          <div className="wizard-options two compact">
            <button type="button" aria-pressed={!custom} onClick={() => onChange({ custom: null })}><strong>목표에 맞춰 자동</strong><small>{plan ? `${n(plan.target.calories)}kcal · 탄${plan.target.carbRatio} 단${plan.target.proteinRatio} 지${plan.target.fatRatio}` : "목표를 고르면 계산돼요"}</small></button>
            <button type="button" aria-pressed={Boolean(custom)} onClick={() => { if (!custom) startCustom(); }}><strong>직접 설정</strong><small>끼니별 칼로리·비율</small></button>
          </div>
          {custom ? <>
            <label className="wizard-field">하루 총 칼로리<div><input type="number" inputMode="numeric" min={800} max={6000} step={10} value={sum(custom.mealCalories) || ""} onChange={e => setTotal(Number(e.target.value))} /><span>kcal</span></div></label>
            {!customOk && <p className="wizard-warn">하루 800~6,000kcal 사이로 정해 주세요.</p>}
            <span className="wizard-label">끼니별 칼로리</span>
            <ul className="meal-kcal-list">{custom.mealCalories.map((value, i) => <li key={i}>
              <span>{labels[i]}</span>
              <div className="meal-kcal-bar" aria-hidden="true"><i style={{ width: `${sum(custom.mealCalories) ? value / sum(custom.mealCalories) * 100 : 0}%` }} /></div>
              <label><input type="number" inputMode="numeric" min={0} max={3000} step={10} value={value || ""} aria-label={`${labels[i]} 칼로리`} onChange={e => setMeal(i, Number(e.target.value))} /><small>kcal</small></label>
            </li>)}</ul>
            <span className="wizard-label">탄단지 비율</span>
            <div className="wizard-options chips">{([["균형", 25, 25], ["저탄수", 35, 35], ["고단백", 35, 25], ["저지방", 30, 15]] as const).map(([label, p, f]) => <button type="button" key={label} aria-pressed={custom.proteinRatio === p && custom.fatRatio === f} onClick={() => setCustom({ proteinRatio: p, fatRatio: f })}>{label} {100 - p - f}·{p}·{f}</button>)}</div>
            <div className="macro-steppers">
              <div className="carb"><span>탄수화물</span><strong>{100 - custom.proteinRatio - custom.fatRatio}%</strong><small>나머지 자동</small></div>
              {(["proteinRatio", "fatRatio"] as const).map(key => <div key={key} className={key === "proteinRatio" ? "protein" : "fat"}><span>{key === "proteinRatio" ? "단백질" : "지방"}</span><div className="stepper"><button type="button" aria-label={`${key === "proteinRatio" ? "단백질" : "지방"} 5% 줄이기`} onClick={() => setRatio(key, -5)}>−</button><strong>{custom[key]}%</strong><button type="button" aria-label={`${key === "proteinRatio" ? "단백질" : "지방"} 5% 늘리기`} onClick={() => setRatio(key, 5)}>+</button></div></div>)}
            </div>
          </> : shown && <ul className="meal-kcal-list is-readonly">{shownMeals.map((value, i) => <li key={i}><span>{labels[i]}</span><div className="meal-kcal-bar" aria-hidden="true"><i style={{ width: `${value / shown.calories * 100}%` }} /></div><b>{n(value)}<small>kcal</small></b></li>)}</ul>}
          </>}
        </>}

        {current === 6 && <>
          <div className="wizard-group" role="group" aria-label="관리 중인 건강 상태"><span className="wizard-label">관리 중인 게 있나요? (선택)</span><div className="wizard-options chips">{(Object.keys(healthFlags) as HealthFlag[]).map(h => <button type="button" key={h} aria-pressed={(diet.health ?? []).includes(h)} onClick={() => onChange({ diet: { ...diet, health: ((h: HealthFlag) => (diet.health ?? []).includes(h) ? (diet.health ?? []).filter(x => x !== h) : [...(diet.health ?? []), h])(h) } })}>{healthFlags[h].label}</button>)}</div></div>
          <p className="wizard-note">알레르기나 싫어하는 재료를 골라 주세요. 없으면 그냥 다음으로 넘어가요.</p>
          {excludedFoodGroups.map(group => <div key={group.label} className="wizard-group" role="group" aria-label={group.label}><span className="wizard-label">{group.label}</span><div className="wizard-options chips">{group.keys.map(key => <button type="button" key={key} aria-pressed={diet.excluded.includes(key)} onClick={() => onChange({ diet: { ...diet, excluded: diet.excluded.includes(key) ? diet.excluded.filter(x => x !== key) : [...diet.excluded, key] } })}>{excludedFoods[key]}</button>)}</div></div>)}
        </>}

        {current === 7 && (!profile ? <p className="wizard-note">아직 입력하지 않은 항목이 있어요. 위의 점을 눌러 해당 단계로 돌아가 주세요.</p> : fields.pregnancy ? <p className="wizard-note">임신·수유 중에는 개인별 영양 상담이 필요해 자동 칼로리·탄단지 계산은 하지 않아요. 입력한 정보와 취향은 저장해서 메뉴 추천에 반영할게요.</p> : <>
          {shown && <>
          <div className="wizard-result-hero"><span>하루 목표 칼로리 · {custom ? "직접 설정" : fields.goal && bodyGoals[fields.goal].label}</span><strong>{n(shown.calories)}<small>kcal</small></strong><em>{shownMeals.map((v, i) => `${labels[i]} ${n(v)}`).join(" · ")}</em></div>
          <div className="wizard-macro-bar" aria-hidden="true"><i className="carb" style={{ flexBasis: `${shown.carbRatio}%` }} /><i className="protein" style={{ flexBasis: `${shown.proteinRatio}%` }} /><i className="fat" style={{ flexBasis: `${shown.fatRatio}%` }} /></div>
          <dl className="wizard-macros">
            <div className="carb"><dt>탄수화물</dt><dd>{shown.carbRatio}%</dd><small>{Math.round(shown.calories * shown.carbRatio / 400)}g</small></div>
            <div className="protein"><dt>단백질</dt><dd>{shown.proteinRatio}%</dd><small>{Math.round(shown.calories * shown.proteinRatio / 400)}g</small></div>
            <div className="fat"><dt>지방</dt><dd>{shown.fatRatio}%</dd><small>{Math.round(shown.calories * shown.fatRatio / 900)}g</small></div>
          </dl>
          </>}
          <dl className="wizard-facts">
            {estimate && <div><dt>기초대사량</dt><dd>{n(estimate.resting)} kcal</dd></div>}
            {estimate && <div><dt>유지 칼로리</dt><dd>{n(estimate.daily)} kcal</dd></div>}
            {body && <div><dt>BMI</dt><dd>{body.value} · {body.label}</dd></div>}
          </dl>
          <p className="wizard-note">{custom ? "직접 정한 목표로 추천해요. 기초대사량보다 크게 낮게 먹는 건 권하지 않아요." : "Mifflin–St Jeor 식과 활동량으로 계산한 참고값이에요. 감량은 하루 최대 500kcal만 줄이고 기초대사량 아래로는 내리지 않아요."}</p>
        </>)}
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}
      <footer className="wizard-actions">
        {current > 0 && <button type="button" className="wizard-back" onClick={() => onStep(move(current, -1))}>이전</button>}
        {current < steps.length - 1
          ? <button type="button" className="wizard-next" disabled={!ready} onClick={next}>{current === 6 && !diet.excluded.length ? "없어요, 다음" : "다음"}</button>
          : <button type="button" className="wizard-next" disabled={!ready || saving} onClick={onSave}>{saving ? "저장하는 중…" : userId ? "저장하고 완료" : "로그인하고 저장하기"}</button>}
      </footer>
    </div>}
  </dialog>;
}
