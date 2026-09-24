"use client";

import { Checkbox } from "./components/checkbox";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { activities, calorieEstimate, parseBodyProfile, type BodyProfile } from "../lib/body-profile";
import { defaultDiet, dietStyles, excludedFoods, excludedFoodGroups, parseDiet, type recommendMeals, type DietPreferences } from "../lib/meal-plan";
import { healthFlags, type HealthFlag } from "../lib/today-context";
import { parseNutritionTarget, type NutritionTarget } from "../lib/nutrition-target";
import { RiceBuddy } from "./rice-buddy";
import { AppLoading } from "./app-loading";
import { invalidateJson } from "../lib/client-cache";
import { WeekAnalysis } from "./week-analysis";
import { WeightCard } from "./weight-card";
import { MealReminderCard } from "./meal-reminder-card";
import { RecordCard, WeeklyReportCard, useIntakeStats } from "./record-progress";
import { mealLabels, ProfileProgress, ProfileWizardModal, readFields, sectionStatus, splitCalories, type CustomTarget, type ProfileFields, type WizardResult } from "./profile-wizard";
import { bodyGoals, nutritionPlan, type BodyGoal } from "../lib/nutrition-plan";

const draftKey = "profile-wizard-draft";

export function BodyProfilePanel({ userId, onLogin, onSaved }: { userId?: string; name: string; onLogin: () => void; onSaved?:()=>void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [activity, setActivity] = useState("");
  const [meals, setMeals] = useState("3");
  const [diet, setDiet] = useState<DietPreferences>(defaultDiet);
  const [variant, setVariant] = useState(0);
  const [storedPlan, setStoredPlan] = useState<{ profile: BodyProfile; diet: DietPreferences; nutritionTarget?: NutritionTarget | null; recommendation: NonNullable<ReturnType<typeof recommendMeals>>; variant: number; createdAt: string | null } | null>(null);
  const [pregnancy, setPregnancy] = useState(false);
  const [targetMode, setTargetMode] = useState<"auto" | "manual">("auto");
  const [targetCalories, setTargetCalories] = useState("");
  const [carbRatio, setCarbRatio] = useState("50");
  const [proteinRatio, setProteinRatio] = useState("30");
  const [fatRatio, setFatRatio] = useState("20");
  const [loading, setLoading] = useState(Boolean(userId));
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedProfile, setSavedProfile] = useState(false);
  const [goal, setGoal] = useState<BodyGoal | "">("");
  const [custom, setCustom] = useState<CustomTarget | null>(null);
  const { stats: intakeStats } = useIntakeStats(userId);
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [quickWizard, setQuickWizard] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [reviewed, setReviewed] = useState<Set<number>>(() => new Set());
  const [dirty, setDirty] = useState(false);
  const fields: ProfileFields = { sex, age, height, weight, activity, meals, pregnancy, diet, goal, custom };
  function changeFields(patch: Partial<ProfileFields>) {
    if (patch.sex !== undefined) setSex(patch.sex);
    if (patch.age !== undefined) setAge(patch.age);
    if (patch.height !== undefined) setHeight(patch.height);
    if (patch.weight !== undefined) setWeight(patch.weight);
    if (patch.activity !== undefined) setActivity(patch.activity);
    if (patch.meals !== undefined) setMeals(patch.meals);
    if (patch.pregnancy !== undefined) setPregnancy(patch.pregnancy);
    if (patch.diet !== undefined) setDiet(patch.diet);
    if (patch.goal !== undefined) setGoal(patch.goal);
    if (patch.custom !== undefined) setCustom(patch.custom);
    // Changing the meal count keeps the daily total and re-spreads it over the new number of meals.
    const nextCustom = patch.custom !== undefined ? patch.custom : custom;
    if (patch.meals !== undefined && nextCustom && nextCustom.mealCalories.length !== Number(patch.meals)) {
      setCustom({ ...nextCustom, mealCalories: splitCalories(nextCustom.mealCalories.reduce((a, b) => a + b, 0), Number(patch.meals)) });
    }
    setDirty(true); setMessage("");
  }
  function openWizard(step: number, quick = false) { setDirection(1); setError(""); setQuickWizard(quick); setWizardStep(step); }
  function stepWizard(step: number) { setDirection(step > (wizardStep ?? 0) ? 1 : -1); setWizardStep(step); }
  // Saves the modal's answers; the goal (if any) recomputes the calorie/macro target from the latest body values.
  function wizardResult(): WizardResult | null {
    const { profile: p, plan } = readFields(fields);
    if (!p) return null;
    return { profile: p, diet, goal, target: p.pregnancy ? null : readFields(fields).target ?? plan?.target ?? nutritionTarget };
  }
  async function closeWizard() {
    const result = wizardResult();
    if (dirty && userId && result) { if (await completeWizard(result)) setWizardStep(null); }
    else setWizardStep(null);
  }
  const profile = parseBodyProfile({ height: Number(height), weight: Number(weight), age: Number(age), sex, activity, meals: Number(meals), pregnancy });
  const ratioSum = Number(carbRatio) + Number(proteinRatio) + Number(fatRatio);
  const nutritionTarget = targetMode === "manual" ? parseNutritionTarget({ calories: Number(targetCalories), carbRatio: Number(carbRatio), proteinRatio: Number(proteinRatio), fatRatio: Number(fatRatio) }) : null;
  const targetError = targetMode === "manual" && !nutritionTarget;
  const planMatches = storedPlan && JSON.stringify(storedPlan.profile) === JSON.stringify(profile) && JSON.stringify(storedPlan.diet) === JSON.stringify(diet) && JSON.stringify(storedPlan.nutritionTarget ?? null) === JSON.stringify(nutritionTarget);
  const recommendation = planMatches ? storedPlan.recommendation : null;
  const showPlan = Boolean(recommendation);
  function focusProfile() {
    const missing = sectionStatus(fields, reviewed, savedProfile).done.findIndex(d => !d);
    // 아직 정보가 없으면 필수 단계만 빠르게.
    openWizard(missing === -1 ? 0 : missing, !savedProfile);
  }
  const calories = profile ? calorieEstimate(profile) : null;
  const hasInfo = savedProfile || Boolean(profile);
  const { body: bodyInfo, target: activeTarget } = readFields({ sex, age, height, weight, activity, meals, pregnancy, diet, goal, custom });
  const shownTarget = activeTarget ?? nutritionTarget;
  const shownMeals = shownTarget ? shownTarget.mealCalories ?? splitCalories(shownTarget.calories, Number(meals)) : [];
  const number = (value: number | undefined) => value === undefined ? "—" : value.toLocaleString("ko-KR");
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    Promise.all([
      fetch("/api/profile", { cache: "no-store", signal: controller.signal }),
      fetch("/api/meal-plans", { cache: "no-store", signal: controller.signal }),
    ]).then(async ([response, plansResponse]) => {
      const data = await response.json() as { profile?: BodyProfile; diet?: DietPreferences; nutritionTarget?: NutritionTarget | null; error?: string };
      const history = await plansResponse.json();
      if (!response.ok) throw new Error(data.error);
      if (!plansResponse.ok) throw new Error(history.error);
      if (controller.signal.aborted) return;
      if (history.plans[0]) {
        const latest = history.plans[0];
        setStoredPlan({...latest,profile:parseBodyProfile(latest.profile),diet:parseDiet(latest.diet),nutritionTarget:parseNutritionTarget(latest.nutritionTarget)});
        setVariant(latest.variant);
      }
      if (!data.profile) {
        let draft: WizardResult | null = null;
        try { draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null"); sessionStorage.removeItem(draftKey); } catch {}
        if (draft && parseBodyProfile(draft.profile)) void completeWizard(draft);
      }
      if (data.profile) {
        setSavedProfile(true);
        const p = data.profile;
        setHeight(String(p.height)); setWeight(String(p.weight)); setAge(String(p.age)); setSex(p.sex);
        setDiet(parseDiet(data.diet) ?? defaultDiet);
        setActivity(p.activity); setMeals(String(p.meals)); setPregnancy(p.pregnancy);
      }
      if (data.nutritionTarget) {
        setTargetMode("manual"); setTargetCalories(String(data.nutritionTarget.calories));
        setCarbRatio(String(data.nutritionTarget.carbRatio)); setProteinRatio(String(data.nutritionTarget.proteinRatio)); setFatRatio(String(data.nutritionTarget.fatRatio));
        const saved = data.profile && parseBodyProfile(data.profile), target = JSON.stringify(data.nutritionTarget);
        const match = saved && (Object.keys(bodyGoals) as BodyGoal[]).find(g => JSON.stringify(nutritionPlan(saved, g)?.target) === target);
        if (match) setGoal(match);
        else if (saved) setCustom({ mealCalories: data.nutritionTarget.mealCalories ?? splitCalories(data.nutritionTarget.calories, saved.meals), proteinRatio: data.nutritionTarget.proteinRatio, fatRatio: data.nutritionTarget.fatRatio });
      }
    }).catch(error => {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : "정보를 불러오지 못했어요."); setLoadError(true);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps -- completeWizard only replays a guest draft once per login

  async function generate(nextVariant: number) {
    if (saving) return;
    setMessage(""); setError("");
    if (!profile) { setError("모든 항목을 입력해 주세요. 만 19~78세의 성인 계산을 지원해요."); return; }
    if (targetError) { setError("칼로리·탄단지 목표를 확인해 주세요. 칼로리는 800~6000kcal, 비율 합은 100%여야 해요."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/meal-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, diet, variant: nextVariant, nutritionTarget }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "식단을 생성하지 못했어요.");
      setStoredPlan(data.plan); setVariant(nextVariant);if(data.saved)onSaved?.();
      setMessage(data.saved ? "맞춤 식단을 저장하고 이번 달 식단도 준비했어요. 주간·월간 보기에서 바로 확인하세요." : "맞춤 식단을 만들었어요. 계정 저장은 로그인 후 이용할 수 있어요.");
    } catch (error) { setError(error instanceof Error ? error.message : "식단을 생성하지 못했어요."); }
    finally { setSaving(false); }
  }
  async function persist(p: BodyProfile, d: DietPreferences, target: NutritionTarget | null) {
    setSaving(true);setError('');setMessage('');
    try{
      invalidateJson('/api/shopping-plan');
      const response=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,diet:d,nutritionTarget:target})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setStoredPlan(null);setSavedProfile(true);onSaved?.();
      setMessage(p.pregnancy?'정보를 저장했어요. 현재는 자동 맞춤 추천을 제공하지 않아요.':'내 정보를 저장했어요. 홈에서 추천받으면 바로 반영돼요.');
      return true;
    }catch(error){setError(error instanceof Error?error.message:'정보를 저장하지 못했어요.');return false;}
    finally{setSaving(false);}
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if(!profile){setError('신체 정보의 필수 항목을 입력해 주세요.');return;}
    if(targetError){setError('칼로리·탄단지 목표를 확인해 주세요. 칼로리는 800~6000kcal, 비율 합은 100%여야 해요.');return;}
    if(!userId){onLogin();return;}
    await persist(profile,diet,nutritionTarget);
  }
  async function completeWizard(result: WizardResult) {
    const {profile:p,diet:d,target,goal:g}=result;
    setHeight(String(p.height));setWeight(String(p.weight));setAge(String(p.age));setSex(p.sex);setActivity(p.activity);setMeals(String(p.meals));setPregnancy(p.pregnancy);setDiet(d);
    setGoal(g);
    if(target){setTargetMode('manual');setTargetCalories(String(target.calories));setCarbRatio(String(target.carbRatio));setProteinRatio(String(target.proteinRatio));setFatRatio(String(target.fatRatio));}
    if(!userId){
      try{sessionStorage.setItem(draftKey,JSON.stringify(result));}catch{}
      setWizardStep(null);onLogin();return false;
    }
    // Home recommendations rank by this goal; failure here shouldn't block the profile save.
    if(g)void fetch('/api/shopping-plan',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal:g})}).catch(()=>{});
    const ok=await persist(p,d,target);
    if(ok)setDirty(false);
    return ok;
  }

  return <>
    {loading ? <AppLoading message="저장된 정보를 불러오는 중이에요"/> : loadError ? <section className="energy-card is-empty"><div><strong>정보를 불러오지 못했어요</strong><p>잠시 후 다시 시도해 주세요.</p><button type="button" className="wizard-next" onClick={()=>window.location.reload()}>다시 불러오기</button></div></section>
    : calories ? <section className="energy-card" aria-label="하루 에너지">
      <div className="energy-top"><span>하루 목표 칼로리 · {custom ? "직접 설정" : goal ? bodyGoals[goal].label : "체중 유지 기준"}</span><button type="button" onClick={()=>openWizard(5)}>칼로리·탄단지 설정</button></div>
      <strong className="energy-kcal">{number(shownTarget?.calories ?? calories.daily)}<small>kcal</small></strong>
      {shownTarget ? <ul className="energy-meals">{shownMeals.map((value,i)=><li key={i}><span>{mealLabels(Number(meals))[i]}</span><b>{number(value)}</b></li>)}</ul> : <p>한 끼 평균 약 {number(Math.round(calories.daily/Number(meals)))} kcal · 하루 {meals}끼</p>}
      {shownTarget && <><div className="energy-macro-bar" aria-hidden="true"><i className="carb" style={{flexBasis:`${shownTarget.carbRatio}%`}}/><i className="protein" style={{flexBasis:`${shownTarget.proteinRatio}%`}}/><i className="fat" style={{flexBasis:`${shownTarget.fatRatio}%`}}/></div>
        <ul className="energy-macros"><li className="carb">탄수화물 <b>{Math.round(shownTarget.calories*shownTarget.carbRatio/400)}g</b></li><li className="protein">단백질 <b>{Math.round(shownTarget.calories*shownTarget.proteinRatio/400)}g</b></li><li className="fat">지방 <b>{Math.round(shownTarget.calories*shownTarget.fatRatio/900)}g</b></li></ul></>}
      <dl className="energy-stats"><div><dt>기초대사량</dt><dd>{number(calories.resting)}<small>kcal</small></dd></div><div><dt>유지 칼로리</dt><dd>{number(calories.daily)}<small>kcal</small></dd></div>{bodyInfo && <div><dt>BMI</dt><dd>{bodyInfo.value}<small>{bodyInfo.label}</small></dd></div>}</dl>
    </section>
    : <section className="energy-card is-empty" aria-label="하루 에너지"><div className="energy-buddy" aria-hidden="true"><RiceBuddy/></div><div><strong>{pregnancy ? "임신·수유 중에는 자동 계산을 쉬어요" : "내 하루 칼로리를 알아볼까요?"}</strong><p>{pregnancy ? "개인별 영양 상담을 권해요. 취향은 메뉴 추천에 반영돼요." : "키·체중·활동량을 알려주면 칼로리와 탄단지를 바로 계산해요."}</p>{!pregnancy && <button type="button" className="wizard-next" onClick={focusProfile}>1분 만에 입력하기</button>}</div></section>}
    {/* 정보가 없을 땐 위의 '1분 만에 입력하기' 카드 하나만 — 선택지를 늘리지 않는다. */}
    {hasInfo && userId && <MealReminderCard/>}
    {hasInfo && userId && <WeightCard userId={userId} fallbackWeight={Number(weight)||null} onLogged={kg=>setWeight(String(kg))}/>}
    {hasInfo && userId && <RecordCard stats={intakeStats}/>}
    {hasInfo && userId && <WeeklyReportCard stats={intakeStats}/>}
    {hasInfo && !loading && !loadError && <WeekAnalysis userId={userId} profile={profile} target={shownTarget} onOpenInfo={focusProfile}/>}
    {hasInfo && !loading && !loadError && <ProfileProgress fields={fields} reviewed={reviewed} saved={savedProfile} onOpen={openWizard}/>}
    <ProfileWizardModal step={wizardStep} direction={direction} quick={quickWizard} fields={fields} userId={userId} saving={saving} error={wizardStep === null ? "" : error}
      onStep={stepWizard} onChange={changeFields} onReviewed={step => setReviewed(r => new Set(r).add(step))} onClose={() => void closeWizard()}
      onSave={() => { const result = wizardResult(); if (!result) return; void completeWizard(result).then(ok => { if (ok) setWizardStep(null); }); }}/>
    {message && wizardStep === null && <p className="body-success" role="status">{message}</p>}
    {/* Hidden for now: the step modal replaces it. Kept for the fasting/first-meal/manual-target inputs the modal doesn't cover. */}
    <details className="profile-full-form" hidden><summary>전체 항목 한 번에 수정</summary>
    <form ref={formRef} id="profile-settings" className="body-form" onSubmit={save} onChange={() => setMessage("")}>
      <div className="section-heading"><div><span className="section-kicker">ABOUT ME</span><h3>신체 정보 설정</h3></div><span className="body-auto">입력하면 자동 계산</span></div>
      {(loading||saving) && <AppLoading message={saving?"나에게 맞는 식단을 준비하고 있어요":"저장된 식단과 정보를 불러오는 중이에요"}/>}
      <fieldset disabled={loading || saving || loadError}>
        <div className="body-input-grid">
          <label>키 <span>cm</span><input type="number" min="100" max="250" step="0.1" inputMode="decimal" placeholder="예: 165" required value={height} onChange={e => setHeight(e.target.value)}/></label>
          <label>현재 체중 <span>kg</span><input type="number" min="30" max="350" step="0.1" inputMode="decimal" placeholder="예: 60" required value={weight} onChange={e => setWeight(e.target.value)}/></label>
          <label>만 나이 <span>세</span><input type="number" min="19" max="78" inputMode="numeric" placeholder="예: 28" required value={age} onChange={e => setAge(e.target.value)}/></label>
          <label>계산식 기준 성별<select required value={sex} onChange={e => setSex(e.target.value)}><option value="">선택해 주세요</option><option value="female">여성</option><option value="male">남성</option></select></label>
        </div>
        <label>평소 활동량<select required value={activity} onChange={e => setActivity(e.target.value)}><option value="">생활 패턴을 선택해 주세요</option>{Object.entries(activities).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select></label>
        <label>하루 식사 횟수<select value={meals} onChange={e => setMeals(e.target.value)}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}끼</option>)}</select></label>
        <div className="diet-settings">
          <h3>칼로리·탄단지 목표를 직접 정할까요?</h3>
          <div className="diet-choices">
            <button type="button" aria-pressed={targetMode==="auto"} onClick={()=>setTargetMode("auto")}>자동 계산 사용</button>
            <button type="button" aria-pressed={targetMode==="manual"} onClick={()=>setTargetMode("manual")}>직접 입력</button>
          </div>
          {targetMode==="manual" && <>
            <label>하루 목표 칼로리 <span>kcal</span><input type="number" min="800" max="6000" step="10" inputMode="numeric" placeholder="예: 1800" value={targetCalories} onChange={e=>setTargetCalories(e.target.value)}/></label>
            <p className="body-note">한 끼 비율 프리셋으로 빠르게 맞추거나 아래에서 직접 입력하세요.</p>
            <div className="diet-choices">{([["균형 50·30·20",50,30,20],["저탄수 30·35·35",30,35,35],["고단백 40·35·25",40,35,25]] as [string,number,number,number][]).map(([label,c,p,f])=><button type="button" key={label} onClick={()=>{setCarbRatio(String(c));setProteinRatio(String(p));setFatRatio(String(f));}}>{label}</button>)}</div>
            <div className="body-input-grid">
              <label>탄수화물 <span>%</span><input type="number" min="0" max="100" step="5" inputMode="numeric" value={carbRatio} onChange={e=>setCarbRatio(e.target.value)}/></label>
              <label>단백질 <span>%</span><input type="number" min="0" max="100" step="5" inputMode="numeric" value={proteinRatio} onChange={e=>setProteinRatio(e.target.value)}/></label>
              <label>지방 <span>%</span><input type="number" min="0" max="100" step="5" inputMode="numeric" value={fatRatio} onChange={e=>setFatRatio(e.target.value)}/></label>
            </div>
            <p className="body-note">비율 합 {ratioSum}%{Math.abs(ratioSum-100)>1?' · 100%로 맞춰 주세요':''}{nutritionTarget?` · 하루 탄수화물 약 ${Math.round(nutritionTarget.calories*nutritionTarget.carbRatio/100/4)}g · 단백질 약 ${Math.round(nutritionTarget.calories*nutritionTarget.proteinRatio/100/4)}g · 지방 약 ${Math.round(nutritionTarget.calories*nutritionTarget.fatRatio/100/9)}g`:''}</p>
            <p className="body-note">직접 입력한 목표는 자동 계산 대신 홈 장보기 추천과 아래 하루 식단 추천에 반영돼요.</p>
          </>}
        </div>
        <div className="diet-settings">
          <h3>어떤 식단을 좋아하세요?</h3>
          <div className="diet-choices">{Object.entries(dietStyles).map(([key,label]) => <button type="button" key={key} aria-pressed={diet.style === key} onClick={() => setDiet({...diet,style:key as DietPreferences["style"]})}>{label}</button>)}</div>
          <label>식사 시간 패턴<select value={diet.fasting} onChange={e => setDiet({...diet,fasting:e.target.value as DietPreferences["fasting"]})}><option value="none">일반 식사</option><option value="14:10">간헐적 단식 14:10 · 10시간 내 식사</option><option value="16:8">간헐적 단식 16:8 · 8시간 내 식사</option></select></label>
          <label>첫 끼 시간<select value={diet.start} onChange={e => setDiet({...diet,start:Number(e.target.value)})}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}</select></label>
          <span className="diet-label">관리 중인 건강 상태 (선택)</span>
          <div className="diet-choices">{(Object.keys(healthFlags) as HealthFlag[]).map(h => <button type="button" key={h} aria-pressed={(diet.health ?? []).includes(h)} onClick={() => setDiet({ ...diet, health: ((h: HealthFlag) => (diet.health ?? []).includes(h) ? (diet.health ?? []).filter(x => x !== h) : [...(diet.health ?? []), h])(h) })}>{healthFlags[h].label}</button>)}</div>
          <p className="body-note">고르면 {(diet.health ?? []).length ? (diet.health ?? []).map(h => healthFlags[h].description).join(", ") : "해당하는 메뉴를 덜 추천해요"}. 진단·치료를 대신하지 않아요.</p>
          <span className="diet-label">추천에서 빼고 싶은 재료</span>
          <p className="body-note">여러 개 선택할 수 있어요. 현재 {diet.excluded.length}개 선택</p>
          {diet.excluded.length>0 && <button type="button" className="text-link" onClick={()=>setDiet({...diet,excluded:[]})}>제외 선택 초기화</button>}
          {excludedFoodGroups.map(group=><div key={group.label} role="group" aria-label={group.label}>
            <h4>{group.label}</h4><div className="diet-choices">{group.keys.map(key=><button type="button" key={key} aria-pressed={diet.excluded.includes(key)} onClick={()=>setDiet({...diet,excluded:diet.excluded.includes(key)?diet.excluded.filter(x=>x!==key):[...diet.excluded,key]})}>{excludedFoods[key]}</button>)}</div>
          </div>)}
          <p className="body-note">레시피 재료와 등록 상품 정보를 기준으로 제외해요. 채소 구성이 불명확한 믹스는 선택한 채소가 포함될 수 있어 함께 제외해요. 알레르기가 있다면 제품 원재료·소스·제조시설 표시도 확인해 주세요.</p>
        </div>
        <label className="body-checkbox"><Checkbox checked={pregnancy} onChange={e => setPregnancy(e.target.checked)}/>임신 또는 수유 중이에요</label>
        <button className="primary-button" type="submit">{saving ? "저장하는 중…" : userId ? "내 정보 저장하고 상품 추천으로" : "로그인하고 내 정보 저장"}</button>
      </fieldset>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loadError && <button className="text-link" type="button" onClick={() => window.location.reload()}>새로고침하고 다시 불러오기</button>}
      {message && <p className="body-success" role="status">{message}</p>}
      {!userId && <p className="body-note">입력한 정보로 필요 열량을 확인할 수 있어요. 상품 맞춤 추천에는 로그인 후 저장한 정보를 사용해요.</p>}
      {!userId && <button type="button" className="text-link" onClick={onLogin}>로그인하기 →</button>}
    </form>
    </details>

    {storedPlan && !planMatches && <p className="body-note">설정이 바뀌었어요. 위 버튼을 눌러 식단을 다시 만들어 주세요.</p>}
    {showPlan && <section className="personal-meals" aria-label="맞춤 식단 추천" aria-live="polite">
      <div className="section-heading"><div><span className="section-kicker">JUST FOR YOU</span><h3>나를 위한 하루 식단</h3></div><span className="personal-meal-badge">하루 {meals}끼</span></div>
      <nav className="meal-period-links" aria-label="식단 기간별 보기"><Link href="/calendar/week">주간 식단 보기 →</Link><Link href="/calendar">월간 식단 보기 →</Link></nav>
      <p className="body-note">여러 날의 식단과 장보기 재료를 함께 확인해요. 저장한 설정으로 주간·월간 식단을 자동으로 준비해요.</p>
      {recommendation ? <>
        {recommendation.version!==2 && <div className="meal-notice">이 식단은 이전 추천 기준으로 저장됐어요. 아침·점심·저녁에 맞춰 다시 만들어 주세요.<button type="button" className="meal-refresh" disabled={saving} onClick={()=>void generate(0)}>새 기준으로 식단 다시 만들기</button></div>}
        <p className="personal-meal-sub">{dietStyles[diet.style]} · {diet.fasting === "none" ? "일반 식사" : `${diet.fasting} 단식`} · 첫 끼 {recommendation.meals[0].time}{diet.fasting !== "none" && ` / 식사 마감 ${recommendation.end}`}</p>
        <div className="personal-meal-total"><div><span>추천 식단 예상 열량</span><strong>{number(recommendation.total)} <small>kcal</small></strong></div><div><span>하루 유지 필요량</span><b>{number(recommendation.target)} kcal</b><span>예상 단백질 {recommendation.protein}g</span></div></div>
        {Math.abs(recommendation.total-recommendation.target) > recommendation.target*.1 && <p className="meal-notice">현재 식사 횟수와 적정 분량으로는 하루 필요량을 맞추기 어려워요. 식사 횟수를 조정해 주세요. 부족한 열량을 감량 목표로 해석하지 마세요.</p>}
        {Number(meals) === 1 && <p className="meal-notice">1일 1식은 한 번에 필요한 영양을 채우기 어려울 수 있어요. 식사 횟수가 줄어도 하루 필요량은 줄지 않아요.</p>}
        {recommendation.meals.map((meal,i)=><article className="personal-meal-card" key={`${i}-${meal.name}`}><div className="personal-meal-head"><span className="personal-meal-emoji" aria-hidden="true">{meal.emoji}</span><div><span>{meal.label ?? `${i+1}번째 끼니`} · {meal.time}</span><h4>{meal.name}</h4></div><b>{meal.kcal}<small>kcal</small></b></div><div className="personal-macros">단백질 {meal.protein}g <i/> 탄수화물 {meal.carbs}g <i/> 지방 {meal.fat}g</div><details><summary>재료 분량과 간단 조리법</summary><ul>{meal.ingredients.map(item=><li key={item.food}><span>{item.name}{item.product?.url && <a className="ingredient-product" href={item.product.url} target="_blank" rel="noopener noreferrer">{item.product.name} ↗</a>}</span><b>{item.grams}{item.unit??"g"}</b></li>)}</ul><p>{meal.tip}</p></details></article>)}
        <button type="button" className="meal-refresh" disabled={saving || loading} onClick={()=>void generate((variant+1)%1000001)}>다른 메뉴 조합 보기 ↻</button>
        <p className="body-note">등록된 영양정보 중 기준 중량을 확인할 수 있는 값과 재료별 참고값으로 계산한 예상치예요. 연결된 상품은 해당 재료의 구매 후보예요. 양념·제품·조리법에 따라 달라져요. 분량은 표시된 조리 상태 기준이며, 설정을 바꾼 뒤 맞춤 식단 버튼을 누르면 다시 계산해요.</p>
        {diet.fasting !== "none" && <p className="body-note">혈당을 낮추는 약을 복용 중이라면 단식 전에 의료진과 상의해 주세요. <a href="https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/fasting-safely-with-diabetes" target="_blank" rel="noopener noreferrer">안내 보기 ↗</a></p>}
      </> : <p className="meal-notice">{pregnancy ? "임신·수유 중에는 자동 식단 추천 대신 개인별 영양 상담을 권해요." : "신체 정보를 확인해 주세요. 선택한 조건에 맞는 식단이 있어야 추천할 수 있어요."}</p>}
    </section>}
    {hasInfo && <nav className="profile-links" aria-label="바로가기"><Link href="/calendar"><b>식단 달력</b><span>홈에서 고른 식단을 날짜별로</span></Link><Link href="/"><b>이번 주 장보기 추천</b><span>내 칼로리·취향이 반영돼요</span></Link></nav>}
    {hasInfo && <details className="calorie-method"><summary>칼로리는 어떻게 계산하나요?</summary><p>Mifflin–St Jeor 식으로 휴식 에너지 소비량을 추정하고, 선택한 활동계수(1.2~1.725)를 곱해 하루 유지 필요량을 계산해요. 실제 섭취 기록의 평균이나 측정된 대사량은 아니에요.</p><p>기초대사량은 최소 섭취 칼로리가 아니에요. 만 19~78세 성인용 참고값이며 임신·수유 중에는 계산하지 않아요. 한 끼 평균은 간식을 포함한 하루 총량을 식사 횟수로 나눈 값이에요.</p><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">계산식 연구 보기 ↗</a></details>}
  </>;
}
