"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { activities, calorieEstimate, parseBodyProfile, type BodyProfile } from "../lib/body-profile";
import { defaultDiet, dietStyles, excludedFoods, excludedFoodGroups, parseDiet, type recommendMeals, type DietPreferences } from "../lib/meal-plan";
import { RiceBuddy } from "./rice-buddy";
import { AppLoading } from "./app-loading";

export function BodyProfilePanel({ userId, name, onLogin }: { userId?: string; name: string; onLogin: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [activity, setActivity] = useState("");
  const [meals, setMeals] = useState("3");
  const [diet, setDiet] = useState<DietPreferences>(defaultDiet);
  const [variant, setVariant] = useState(0);
  const [storedPlan, setStoredPlan] = useState<{ profile: BodyProfile; diet: DietPreferences; recommendation: NonNullable<ReturnType<typeof recommendMeals>>; variant: number; createdAt: string | null } | null>(null);
  const [pregnancy, setPregnancy] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const profile = parseBodyProfile({ height: Number(height), weight: Number(weight), age: Number(age), sex, activity, meals: Number(meals), pregnancy });
  const planMatches = storedPlan && JSON.stringify(storedPlan.profile) === JSON.stringify(profile) && JSON.stringify(storedPlan.diet) === JSON.stringify(diet);
  const recommendation = planMatches ? storedPlan.recommendation : null;
  const showPlan = Boolean(recommendation);
  const missingFields = [[height,"키"],[weight,"체중"],[age,"만 나이"],[sex,"성별"],[activity,"활동량"]].filter(([value])=>!value.trim()).map(([,label])=>label);
  function focusProfile() {
    const field = formRef.current?.querySelector<HTMLElement>('input:invalid, select:invalid');
    (field ?? formRef.current)?.scrollIntoView({behavior:"smooth",block:"center"});
    field?.focus({preventScroll:true});
  }
  const calories = profile ? calorieEstimate(profile) : null;
  const number = (value: number | undefined) => value === undefined ? "—" : value.toLocaleString("ko-KR");
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    Promise.all([
      fetch("/api/profile", { cache: "no-store", signal: controller.signal }),
      fetch("/api/meal-plans", { cache: "no-store", signal: controller.signal }),
    ]).then(async ([response, plansResponse]) => {
      const data = await response.json() as { profile?: BodyProfile; diet?: DietPreferences; error?: string };
      const history = await plansResponse.json();
      if (!response.ok) throw new Error(data.error);
      if (!plansResponse.ok) throw new Error(history.error);
      if (controller.signal.aborted) return;
      if (history.plans[0]) {
        const latest = history.plans[0];
        setStoredPlan({...latest,profile:parseBodyProfile(latest.profile),diet:parseDiet(latest.diet)});
        setVariant(latest.variant);
      }
      if (data.profile) {
        const p = data.profile;
        setHeight(String(p.height)); setWeight(String(p.weight)); setAge(String(p.age)); setSex(p.sex);
        setDiet(parseDiet(data.diet) ?? defaultDiet);
        setActivity(p.activity); setMeals(String(p.meals)); setPregnancy(p.pregnancy);
      }
    }).catch(error => {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : "정보를 불러오지 못했어요."); setLoadError(true);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId]);

  async function generate(nextVariant: number) {
    if (saving) return;
    setMessage(""); setError("");
    if (!profile) { setError("모든 항목을 입력해 주세요. 만 19~78세의 성인 계산을 지원해요."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/meal-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, diet, variant: nextVariant }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "식단을 생성하지 못했어요.");
      setStoredPlan(data.plan); setVariant(nextVariant);
      setMessage(data.saved ? "신체 정보, 식단 취향과 맞춤 식단을 저장했어요." : "맞춤 식단을 만들었어요. 계정 저장은 로그인 후 이용할 수 있어요.");
    } catch (error) { setError(error instanceof Error ? error.message : "식단을 생성하지 못했어요."); }
    finally { setSaving(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    // The existing profile endpoint also supports saving conditions that disable recommendations.
    if (profile?.pregnancy && userId) {
      setSaving(true); setError(""); setMessage("");
      try {
        const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...profile,diet}) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setStoredPlan(null); setMessage("신체 정보를 저장했어요. 임신·수유 중에는 자동 식단 추천을 제공하지 않아요.");
      } catch (error) { setError(error instanceof Error ? error.message : "저장하지 못했어요."); }
      finally { setSaving(false); }
      return;
    }
    await generate(0);
  }

  return <>
    <div className="home-guide-entry"><strong>한 달 식단과 이번 주 장보기</strong><p>아래 정보를 저장한 뒤 달력에서 월간 식단을 만들고, 필요한 재료를 한 번에 담아 보세요.</p><Link href="/calendar">월간 식단 달력으로 →</Link></div>
    <div className="page-intro"><div className="week-label">나를 조금 더 알아가는 시간</div><h2>{userId ? `${name}님의` : "나의"} <span>하루 에너지</span></h2><p>지금의 몸과 생활에 맞는 칼로리를 알아봐요.</p></div>
    {!showPlan && <section className="personal-meal-card" aria-label="맞춤 추천 안내" aria-live="polite">
      <h3>{loading ? "저장된 신체 정보를 확인하고 있어요" : loadError ? "신체 정보를 불러오지 못했어요" : !profile ? "맞춤 추천을 위해 신체 정보를 입력해 주세요" : pregnancy ? "현재는 자동 맞춤 추천을 제공하지 않아요" : "맞춤 식단을 만들어 주세요"}</h3>
      <p className="body-note">{loading ? "확인이 끝나면 바로 아래 설정에서 정보를 입력할 수 있어요." : loadError ? "다시 불러오기를 눌러 저장된 정보를 확인해 주세요." : missingFields.length ? `아직 입력하지 않은 항목: ${missingFields.join(" · ")}. 아래 정보를 입력하고 ‘저장하고 맞춤 식단 보기’를 눌러 주세요.` : !profile ? "키·체중·나이의 입력 범위를 확인해 주세요. 모든 필수 항목이 입력되어야 맞춤 추천을 만들 수 있어요." : pregnancy ? "임신·수유 중에는 개인별 영양 상담이 필요해요." : storedPlan ? "변경한 설정으로 식단을 다시 만들면 추천이 표시돼요." : "신체 정보가 준비됐어요. 버튼을 누르면 선택한 취향에 맞는 식단을 만들어요."}</p>
      {loadError ? <button type="button" className="primary-button" onClick={()=>window.location.reload()}>다시 불러오기</button> : !profile ? <button type="button" className="primary-button" disabled={loading} onClick={focusProfile}>신체 정보 설정으로 바로 가기 →</button> : !pregnancy && <button type="button" className="primary-button" disabled={saving} onClick={()=>formRef.current?.requestSubmit()}>{saving?"맞춤 식단을 만드는 중…":"저장하고 맞춤 식단 보기"}</button>}
    </section>}
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
          <h3>어떤 식단을 좋아하세요?</h3>
          <div className="diet-choices">{Object.entries(dietStyles).map(([key,label]) => <button type="button" key={key} aria-pressed={diet.style === key} onClick={() => setDiet({...diet,style:key as DietPreferences["style"]})}>{label}</button>)}</div>
          <label>식사 시간 패턴<select value={diet.fasting} onChange={e => setDiet({...diet,fasting:e.target.value as DietPreferences["fasting"]})}><option value="none">일반 식사</option><option value="14:10">간헐적 단식 14:10 · 10시간 내 식사</option><option value="16:8">간헐적 단식 16:8 · 8시간 내 식사</option></select></label>
          <label>첫 끼 시간<select value={diet.start} onChange={e => setDiet({...diet,start:Number(e.target.value)})}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}</select></label>
          <span className="diet-label">추천에서 빼고 싶은 재료</span>
          <p className="body-note">여러 개 선택할 수 있어요. 현재 {diet.excluded.length}개 선택</p>
          {diet.excluded.length>0 && <button type="button" className="text-link" onClick={()=>setDiet({...diet,excluded:[]})}>제외 선택 초기화</button>}
          {excludedFoodGroups.map(group=><div key={group.label} role="group" aria-label={group.label}>
            <h4>{group.label}</h4><div className="diet-choices">{group.keys.map(key=><button type="button" key={key} aria-pressed={diet.excluded.includes(key)} onClick={()=>setDiet({...diet,excluded:diet.excluded.includes(key)?diet.excluded.filter(x=>x!==key):[...diet.excluded,key]})}>{excludedFoods[key]}</button>)}</div>
          </div>)}
          <p className="body-note">레시피 재료와 등록 상품 정보를 기준으로 제외해요. 채소 구성이 불명확한 믹스는 선택한 채소가 포함될 수 있어 함께 제외해요. 알레르기가 있다면 제품 원재료·소스·제조시설 표시도 확인해 주세요.</p>
        </div>
        <label className="body-checkbox"><input type="checkbox" checked={pregnancy} onChange={e => setPregnancy(e.target.checked)}/>임신 또는 수유 중이에요</label>
        <button className="primary-button" type="submit">{saving ? "저장하는 중…" : userId ? "저장하고 맞춤 식단 보기" : "내 맞춤 식단 만들기"}</button>
      </fieldset>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loadError && <button className="text-link" type="button" onClick={() => window.location.reload()}>새로고침하고 다시 불러오기</button>}
      {message && <p className="body-success" role="status">{message}</p>}
      {!userId && <p className="body-note">로그인 없이 계산과 추천을 이용할 수 있어요.</p>}
      {!userId && <button type="button" className="text-link" onClick={onLogin}>로그인하기 →</button>}
    </form>
    <div className="body-buddy-banner"><RiceBuddy/><div><strong>나에게 딱 맞게, 무리하지 않게.</strong><span>하루에 필요한 에너지를 같이 살펴볼게요.</span></div></div>
    <section className="calorie-hero" aria-label="하루 유지 칼로리">{!profile && !loading && !loadError && <div role="status" style={{display:"block",marginBottom:20}}><h3>맞춤 추천을 위해 신체 정보를 입력해 주세요</h3><p>{missingFields.length ? `입력할 항목: ${missingFields.join(" · ")}` : "키·체중·나이와 선택 항목을 확인해 주세요."}</p><button type="button" className="primary-button" onClick={focusProfile}>신체 정보 설정으로 바로 가기 →</button></div>}<span>평균 하루 필요량 · 체중 유지 기준</span><strong>{number(calories?.daily)} <small>kcal</small></strong><p>{calories ? "일상생활과 운동에 쓰는 에너지의 추정치예요." : pregnancy ? "임신·수유 중에는 개인별 영양 상담이 필요해요." : "아래 신체 정보를 입력하면 바로 계산해 드려요."}</p><div><span>한 끼 평균 · 하루 {meals}끼 기준</span><b>{number(calories?.perMeal)} kcal</b></div></section>
    <div className="calorie-detail-grid"><article><span>기초대사량 참고값</span><strong>{number(calories?.resting)} <small>kcal</small></strong><p>휴식 상태의 에너지 소비량 추정</p></article><article><span>최소 섭취 칼로리</span><strong className="calorie-text">개인별 확인</strong><p>키와 체중만으로 안전한 최저 섭취량을 정할 수 없어요.</p></article></div>

    {storedPlan && !planMatches && <p className="body-note">설정이 바뀌었어요. 위 버튼을 눌러 식단을 다시 만들어 주세요.</p>}
    {showPlan && <section className="personal-meals" aria-label="맞춤 식단 추천" aria-live="polite">
      <div className="section-heading"><div><span className="section-kicker">JUST FOR YOU</span><h3>나를 위한 하루 식단</h3></div><span className="personal-meal-badge">하루 {meals}끼</span></div>
      <nav className="meal-period-links" aria-label="식단 기간별 보기"><Link href="/calendar/week">주간 식단 보기 →</Link><Link href="/calendar">월간 식단 보기 →</Link></nav>
      <p className="body-note">여러 날의 식단과 장보기 재료를 함께 확인해요. 저장된 월간 식단이 없으면 이동한 화면에서 만들 수 있어요.</p>
      {recommendation ? <>
        {recommendation.version!==2 && <div className="meal-notice">이 식단은 이전 추천 기준으로 저장됐어요. 아침·점심·저녁에 맞춰 다시 만들어 주세요.<button type="button" className="meal-refresh" disabled={saving} onClick={()=>void generate(0)}>새 기준으로 식단 다시 만들기</button></div>}
        <p className="personal-meal-sub">{dietStyles[diet.style]} · {diet.fasting === "none" ? "일반 식사" : `${diet.fasting} 단식`} · 첫 끼 {recommendation.meals[0].time}{diet.fasting !== "none" && ` / 식사 마감 ${recommendation.end}`}</p>
        <div className="personal-meal-total"><div><span>추천 식단 예상 열량</span><strong>{number(recommendation.total)} <small>kcal</small></strong></div><div><span>하루 유지 필요량</span><b>{number(recommendation.target)} kcal</b><span>예상 단백질 {recommendation.protein}g</span></div></div>
        {Math.abs(recommendation.total-recommendation.target) > recommendation.target*.1 && <p className="meal-notice">현재 식사 횟수와 적정 분량으로는 하루 필요량을 맞추기 어려워요. 식사 횟수를 조정해 주세요. 부족한 열량을 감량 목표로 해석하지 마세요.</p>}
        {Number(meals) === 1 && <p className="meal-notice">1일 1식은 한 번에 필요한 영양을 채우기 어려울 수 있어요. 식사 횟수가 줄어도 하루 필요량은 줄지 않아요.</p>}
        {recommendation.meals.map((meal,i)=><article className="personal-meal-card" key={`${i}-${meal.name}`}><div className="personal-meal-head"><span className="personal-meal-emoji" aria-hidden="true">{meal.emoji}</span><div><span>{meal.label ?? `${i+1}번째 끼니`} · {meal.time}</span><h4>{meal.name}</h4></div><b>{meal.kcal}<small>kcal</small></b></div><div className="personal-macros">단백질 {meal.protein}g <i/> 탄수화물 {meal.carbs}g <i/> 지방 {meal.fat}g</div><details><summary>재료 분량과 간단 조리법</summary><ul>{meal.ingredients.map(item=><li key={item.food}><span>{item.name}{item.product?.url && <a className="ingredient-product" href={item.product.url} target="_blank" rel="noopener noreferrer">{item.product.name} ↗</a>}</span><b>{item.grams}g</b></li>)}</ul><p>{meal.tip}</p></details></article>)}
        <button type="button" className="meal-refresh" disabled={saving || loading} onClick={()=>void generate((variant+1)%1000001)}>다른 메뉴 조합 보기 ↻</button>
        <p className="body-note">등록된 영양정보 중 기준 중량을 확인할 수 있는 값과 재료별 참고값으로 계산한 예상치예요. 연결된 상품은 해당 재료의 구매 후보예요. 양념·제품·조리법에 따라 달라져요. 분량은 표시된 조리 상태 기준이며, 설정을 바꾼 뒤 맞춤 식단 버튼을 누르면 다시 계산해요.</p>
        {diet.fasting !== "none" && <p className="body-note">혈당을 낮추는 약을 복용 중이라면 단식 전에 의료진과 상의해 주세요. <a href="https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/fasting-safely-with-diabetes" target="_blank" rel="noopener noreferrer">안내 보기 ↗</a></p>}
      </> : <p className="meal-notice">{pregnancy ? "임신·수유 중에는 자동 식단 추천 대신 개인별 영양 상담을 권해요." : "신체 정보를 확인해 주세요. 선택한 조건에 맞는 식단이 있어야 추천할 수 있어요."}</p>}
    </section>}
    <details className="calorie-method"><summary>칼로리는 어떻게 계산하나요?</summary><p>Mifflin–St Jeor 식으로 휴식 에너지 소비량을 추정하고, 선택한 활동계수(1.2~1.725)를 곱해 하루 유지 필요량을 계산해요. 실제 섭취 기록의 평균이나 측정된 대사량은 아니에요.</p><p>기초대사량은 최소 섭취 칼로리가 아니에요. 만 19~78세 성인용 참고값이며 임신·수유 중에는 계산하지 않아요. 한 끼 평균은 간식을 포함한 하루 총량을 식사 횟수로 나눈 값이에요.</p><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">계산식 연구 보기 ↗</a></details>
  </>;
}
