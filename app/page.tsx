"use client";

import './home-readability.css';
import {pendingRecordMode,clearRecordMode} from '../lib/record-intent';
import {InstallPrompt} from './install-prompt';
import {PolicyLinks} from './policy-links';
import {PlanCalendar} from './plan-calendar';
import {ComparisonTrends} from './comparison-trends';
import {trackComparison} from '../lib/track-comparison';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import { MonthlyPlanner } from "./monthly-planner";
import { Dashboard } from "./dashboard";
import { ResetData } from "./reset-data";
import { FoodIntake } from "./food-intake";
import { ShoppingPlanner } from "./shopping-planner";
import { emptyDashboard, type DashboardData } from "../lib/dashboard";
import { AuthScreen } from "./auth-screen";
import { CommunityPanel, SharedBasket } from "./community";
import { BudgetSettings } from "./budget-settings";
import { BodyProfilePanel } from "./body-profile";
import {AppShell,Brand,Icon,type IconName} from './app-shell';
import { googleAuthErrors, type GoogleAuthErrorCode } from "../lib/auth-messages";
import type { PublicUser } from "../lib/auth";
import { catalogCategories, shoppingSearchLinks, unitPrice, type CatalogItem, type CompareResponse } from "../lib/catalog";
import { ProductThumb } from "./product-thumb";
import { CatalogFilter } from "./catalog-filter";
import { AppLoading, useLoadingTask } from "./app-loading";
import { cachedJson, hasFreshJson, invalidateJson, primeJson } from "../lib/client-cache";

const catalogTtl=10*60_000,dashboardTtl=60_000;
import {ServiceFeedback} from './service-feedback';
import {DailyReturnCard} from './daily-return-card';

type Tab = "community" | "home" | "calendar" | "cart" | "compare" | "record" | "profile";
const formatWon=(value:number)=>new Intl.NumberFormat('ko-KR').format(value)+'원';
export default function Home() {
  const [recordDate,setRecordDate]=useState(()=>emptyDashboard().today);
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[1];
  const tab: Tab = (["calendar", "cart", "record", "community", "profile", "compare"] as string[]).includes(section) ? section as Tab : "home";
  const setTab = (next: Tab) => router.push(next === "home" ? "/" : `/${next}`);
  const contentRef=useRef<HTMLDivElement>(null);
  const startLoading = useLoadingTask();
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);
  const [authError, setAuthError] = useState("");
  useEffect(()=>{
    const reset=(event:StorageEvent)=>{
      if(event.key!=='kkiniplan-data-reset'||!event.newValue)return;
      try{const data=JSON.parse(event.newValue);if(data.userId===(authUser?.id??'guest')){sessionStorage.removeItem(`kkiniplan-shopping-draft-v2-${authUser?.id??'guest'}`);window.location.reload();}}catch{/* Ignore an invalid cross-tab notification. */}
    };
    window.addEventListener('storage',reset);return()=>window.removeEventListener('storage',reset);
  },[authUser?.id]);
  // 넓은 화면은 안쪽 영역, 모바일은 페이지 전체가 스크롤된다 — 탭을 바꾸면 둘 다 맨 위로.
  useEffect(()=>{contentRef.current?.scrollTo({top:0});window.scrollTo({top:0});},[tab]);
  const [dashboard,setDashboard]=useState<DashboardData|null>(null);
  const [catalogError,setCatalogError]=useState("");
  const [catalogLoaded,setCatalogLoaded]=useState(false);
  const [dataError,setDataError]=useState("");
  const [showSetup,setShowSetup]=useState(false);
  const [draftBudget,setDraftBudget]=useState("");
  const [savingBudget,setSavingBudget]=useState(false);
  const budget=dashboard?.budget ?? 0;
  const compareProductId = tab === "compare" ? decodeURIComponent(pathname.split("/")[2] ?? "") : "";
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"unit" | "total">("unit");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [catalogShown, setCatalogShown] = useState(24);
  const filteredProducts = products.filter((product) => (catalogCategory === "all" || product.category === catalogCategory) && `${product.name} ${product.detail}`.toLocaleLowerCase().includes(catalogQuery.trim().toLocaleLowerCase()));
  const visibleProducts = filteredProducts.slice(0, catalogShown);
  const compareProduct = products.find((product) => product.id === compareProductId);
  const compareOffers = [...(comparison?.offers ?? [])].sort((a, b) => sortBy === "unit" ? (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY) || a.price - b.price : a.price - b.price);
  const compareLinks = shoppingSearchLinks(compareProduct?.searchQuery ?? "");
  const openCompare = (itemId: string) => { trackComparison(itemId); setComparison(null); setCompareLoading(true); setSortBy("unit"); router.push(`/compare/${encodeURIComponent(itemId)}`); };
  async function refreshDashboard(){invalidateJson("/api/dashboard");const r=await fetch("/api/dashboard",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);primeJson(`/api/dashboard|${authUser?.id??"guest"}`,d);setDashboard(d);}
  const editBudget=()=>{if(!authUser){setShowAuth(true);return;}setDraftBudget(dashboard?.budget?.toString()??"");setShowSetup(true);};
  async function saveSetup(event:React.FormEvent){event.preventDefault();setSavingBudget(true);setDataError("");try{const r=await fetch("/api/dashboard",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"budget",amount:Number(draftBudget)})});const d=await r.json();if(!r.ok)throw new Error(d.error);await refreshDashboard();setShowSetup(false);}catch(e){setDataError(e instanceof Error?e.message:"저장하지 못했어요.");}finally{setSavingBudget(false);}}
  const displayName = authUser?.name ?? "나";

  // 홈은 레시피 추천(/api/shopping-plan)만 쓴다 — 예전 상품 목록(/api/catalog)은 받지 않는다.
  const needsCatalog = tab === "cart" || tab === "compare" || tab === "community";
  useEffect(() => {
    if(!needsCatalog||catalogLoaded)return;
    const controller=new AbortController();
    const finish = hasFreshJson("/api/catalog",catalogTtl)?()=>{}:startLoading("식단과 장바구니를 준비하고 있어요");
    void cachedJson("/api/catalog",{ttl:catalogTtl}).then(catalog=>{
        if(!controller.signal.aborted){setProducts(catalog.items ?? []);setCatalogError("");setCatalogLoaded(true);}
      }).catch(()=>{if(!controller.signal.aborted){setCatalogLoaded(true);setCatalogError("상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");}}).finally(finish);
    return()=>{controller.abort();finish();};
  },[needsCatalog,catalogLoaded,startLoading]);

  useEffect(() => {
    let controller:AbortController|undefined;
    const reload=(showLoading:boolean)=>{
      controller?.abort();
      const request=new AbortController();controller=request;
      // Refresh records after an expense change without restarting the catalog or toast.
      const key=`/api/dashboard|${authUser?.id??"guest"}`;
      if(!showLoading)invalidateJson(key);
      const finish=showLoading&&!hasFreshJson(key,dashboardTtl)?startLoading("이번 주 식단·예산을 불러오고 있어요"):undefined;
      void cachedJson("/api/dashboard",{key,ttl:dashboardTtl}).then(dash=>{
        if(!request.signal.aborted){setDashboard(dash);setDataError("");}
      }).catch(e=>{if(!request.signal.aborted)setDataError(e.message);}).finally(finish);
    };
    reload(true);
    const onExpensesChanged=()=>reload(false);
    window.addEventListener("expenses-changed",onExpensesChanged);
    return()=>{controller?.abort();window.removeEventListener("expenses-changed",onExpensesChanged);};
  },[authUser?.id,startLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const finish = startLoading("로그인 상태를 확인하고 있어요");
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { user: PublicUser | null; error?: string };
        if (!response.ok) throw new Error(data.error ?? "로그인 상태를 확인할 수 없습니다.");
        setAuthUser(data.user);
        if(data.user&&pendingRecordMode())router.replace("/record");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("로그인 상태 확인 실패", error);
      })
      .finally(() => {
        finish();
        if (controller.signal.aborted) return;
        const url = new URL(window.location.href);
        const code = url.searchParams.get("auth_error");
        if (code && Object.hasOwn(googleAuthErrors, code)) {
          setAuthError(googleAuthErrors[code as GoogleAuthErrorCode]);
          setShowAuth(true);
          url.searchParams.delete("auth_error");
          window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        }
      });
    return () => { controller.abort(); finish(); };
  }, [startLoading,router]);

  const signOut = async () => {
    const finish = startLoading("로그아웃하고 있어요");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("로그아웃을 처리할 수 없습니다.");
      setDashboard(null);
      setAuthUser(null);
      setShowAuth(false);
      setShowSetup(false);
      setTab("home");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그아웃을 처리할 수 없습니다.");
    } finally { finish(); }
  };

  useEffect(() => {
    if (tab !== "compare") return;
    const controller = new AbortController();
    fetch(`/api/compare?item=${encodeURIComponent(compareProductId)}`, { signal: controller.signal })
      .then(async (response) => await response.json() as CompareResponse)
      .then((data) => { setComparison(data); setCompareLoading(false); })
      .catch((error: unknown) => { if (error instanceof Error && error.name === "AbortError") return; setComparison({ status: "error", itemId: compareProductId, checkedAt: null, offers: [], message: "가격을 불러오지 못했습니다." }); setCompareLoading(false); });
    return () => controller.abort();
  }, [tab, compareProductId]);

  return <AppShell>
    {savingBudget && <AppLoading message="이번 주 예산을 저장하고 있어요"/>}
      {showAuth ? <AuthScreen initialError={authError} onExplore={() => { clearRecordMode();setShowAuth(false); setAuthError(""); }} onSuccess={(user) => { setDashboard(null); setAuthUser(user); setAuthError(""); setShowAuth(false); setTab(pendingRecordMode()?"record":"home"); }}/> : <>
      <header className="app-header"><Brand/><div className="app-header-actions">{authUser ? <button className="logout-link" type="button" onClick={signOut}>로그아웃</button> : <button className="logout-link" type="button" onClick={() => { setAuthError(""); setShowAuth(true); }}>로그인</button>}</div></header>
      <div className={`app-content app-content-${tab}`} ref={contentRef}>
        <InstallPrompt active={tab === 'home'}/>
        {tab === "record" && <FoodIntake key={`intake-${authUser?.id??"guest"}-${tab}`} userId={authUser?.id} onLogin={()=>setShowAuth(true)} history={tab==="record"} recordDate={recordDate} onDateChange={setRecordDate}/>}
        {tab==='home'&&authUser&&<DailyReturnCard key={authUser.id} userId={authUser.id} onRecord={()=>{setRecordDate(emptyDashboard().today);setTab('record');}}/>}
        {tab === "home" && <ShoppingPlanner key={`shopping-home-${authUser?.id??"guest"}`} dashboard={dashboard} userId={authUser?.id} onLogin={()=>setShowAuth(true)}/>}
        {authError && <p className="auth-inline-error" role="alert">{authError}</p>}
        {dataError&&<p className="auth-error" role="alert">{dataError}</p>}

        {(tab==="home"||tab==="cart"||tab==="compare") && catalogError && <p className="auth-error" role="alert">{catalogError}</p>}
        {tab==="cart" && catalogLoaded && !catalogError && products.length===0 && <p className="body-note">등록된 상품이 없습니다.</p>}
        {tab==="compare" && catalogLoaded && !catalogError && !compareProduct && <p className="body-note">상품을 찾을 수 없습니다.</p>}
        {tab === "record" && <section className="home-guide-entry"><strong>지난 식단과 지출 돌아보기</strong><p>달력은 기록이 쌓인 뒤 필요할 때 열어 보세요.</p><Link href="/calendar">식단·지출 달력 열기 →</Link></section>}
        {tab === "record" && dashboard && <details className="intake-pantry"><summary>식비·생활비 관리</summary><Dashboard key={`${authUser?.id??"guest"}-${tab}-${recordDate}`} mode={tab} recordDate={recordDate} data={dashboard} userId={authUser?.id} products={products} onLogin={()=>setShowAuth(true)} onProfile={()=>setTab("profile")} onCart={()=>setTab("cart")} onCalendar={()=>setTab("calendar")} onBudget={editBudget} onRefresh={refreshDashboard} onCompare={openCompare}/></details>}
        {tab === "calendar" && <><PlanCalendar key={`plan-calendar-${authUser?.id??"guest"}`} userId={authUser?.id}/>{dashboard&&<details><summary>지출 기록·기존 하루 식단 보기</summary><Dashboard key={`${authUser?.id??"guest"}-calendar`} mode="calendar" data={dashboard} userId={authUser?.id} products={products} onLogin={()=>setShowAuth(true)} onProfile={()=>setTab("profile")} onCart={()=>setTab("cart")} onCalendar={()=>setTab("calendar")} onBudget={editBudget} onRefresh={refreshDashboard} onCompare={openCompare}/></details>}</>}
        {tab === "cart" && <>
          <ShoppingPlanner key={`shopping-${authUser?.id??"guest"}`} mode="cart" userId={authUser?.id} onLogin={()=>setShowAuth(true)}/><details><summary>직접 요리할 식단의 재료 보기</summary><MonthlyPlanner key={`ingredients-${authUser?.id??"guest"}`} mode="cart" userId={authUser?.id} onLogin={()=>setShowAuth(true)}/></details>
          <SharedBasket key={authUser?.id ?? "guest"} userId={authUser?.id} onCompare={openCompare}/>
          <div className="page-intro"><div className="week-label"><Icon name="bag" size={15}/> 판매 상품 카탈로그</div><h2>식탁을 채울 <span>장바구니</span></h2><p>식재료와 밀키트, 냉동식품을 눌러 가격과 영양 정보를 확인해 보세요.</p></div>
          <div className="list-heading"><h3>전체 상품 <span>{products.length}</span></h3><small>눌러서 판매처 비교</small></div>
          <CatalogFilter query={catalogQuery} category={catalogCategory} onQuery={(value) => { setCatalogQuery(value); setCatalogShown(24); }} onCategory={(value) => { setCatalogCategory(value); setCatalogShown(24); }}/>
          {catalogLoaded && !catalogError && products.length > 0 && filteredProducts.length === 0 && <p className="body-note">검색 결과가 없습니다.</p>}
          {(catalogQuery.trim() || catalogCategory !== "all") && catalogLoaded && !catalogError && <p className="body-note" role="status">전체 {products.length}개 중 {filteredProducts.length}개</p>}
          {visibleProducts.length > 0 && <div className="food-list">{visibleProducts.map((food) => <button key={food.id} type="button" className="food-row comparison-entry" onClick={() => openCompare(food.id)}><ProductThumb item={food}/><span className="food-meta"><strong>{food.name}</strong><small>{catalogCategories[food.category]} · {food.detail}</small><em>{(food.nutritionSourceUrl || food.nutritionPhotoUrl) && food.proteinG !== null ? `단백질 ${food.proteinG}g / ${food.nutritionBasis}` : "영양 정보 확인 중"}</em></span><span className="food-price"><strong>{formatWon(food.price)}{food.priceNote?.includes("시작가") ? "~" : ""}</strong><small>가격 변동 가능 · {food.priceCheckedAt ? new Date(food.priceCheckedAt).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})+" 확인" : "확인일 미기록"}</small><small>{food.unit === "g" ? "100g당" : "1개당"} {formatWon(unitPrice(food.price, food.quantity, food.unit))}</small></span><Icon name="chevron" size={17}/></button>)}</div>}
          {filteredProducts.length > catalogShown && <button type="button" className="text-link" onClick={() => setCatalogShown((n) => n + 24)}>상품 더 보기 · {filteredProducts.length - catalogShown}개 남음</button>}
          <div className="cart-note"><Icon name="spark" size={17}/><p>표시 가격은 확인 시점 기준으로 변동될 수 있어요. 할인·쿠폰·옵션·배송비에 따라 최종 결제금액이 달라지니 구매 전 판매처에서 확인해 주세요.</p></div>
        </>}

        {tab === "compare" && compareProduct && <>
          <button className="compare-back" type="button" onClick={() => setTab("cart")}><Icon name="left" size={17}/> 장바구니로 돌아가기</button>
          <div className="page-intro compare-intro"><div className="week-label"><Icon name="bag" size={15}/> 상품 온라인 가격 비교</div><h2>{compareProduct.name} <span>비교</span></h2><p>상품별 가격과 용량을 같은 기준으로 살펴봐요.</p></div>
          <div className="compare-product"><ProductThumb item={compareProduct}/><div><strong>{compareProduct.name}</strong><span>판매 구성 {compareProduct.detail}</span></div></div>
          {(compareProduct.productUrl || compareProduct.nutritionSourceUrl || compareProduct.nutritionPhotoUrl) && <div className="catalog-sources">{compareProduct.productUrl && <a href={compareProduct.productUrl} target="_blank" rel="noopener noreferrer">등록된 상품 페이지 ↗</a>}{compareProduct.nutritionSourceUrl && <a href={compareProduct.nutritionSourceUrl} target="_blank" rel="noopener noreferrer">영양 정보 원문 · {compareProduct.nutritionSourceName} ↗</a>}{compareProduct.nutritionPhotoUrl && <a href={compareProduct.nutritionPhotoUrl} target="_blank" rel="noopener noreferrer">영양표 사진 ↗</a>}</div>}
          {(compareProduct.nutritionSourceUrl || compareProduct.nutritionPhotoUrl) && [compareProduct.caloriesKcal, compareProduct.proteinG, compareProduct.carbohydratesG, compareProduct.fatG, compareProduct.sodiumMg].some((value) => value !== null) && <div className="nutrition-panel"><strong>영양 정보 <small>{compareProduct.nutritionBasis} 기준</small></strong><div>{[["열량",compareProduct.caloriesKcal,"kcal"],["단백질",compareProduct.proteinG,"g"],["탄수화물",compareProduct.carbohydratesG,"g"],["지방",compareProduct.fatG,"g"],["나트륨",compareProduct.sodiumMg,"mg"]].filter((entry) => entry[1] !== null).map(([label,value,unit]) => <span key={label}>{label} <b>{value}{unit}</b></span>)}</div></div>}
          <p className="body-note">확인 시점 가격 {formatWon(compareProduct.price)} · {compareProduct.priceNote ?? "관리자 등록 가격"}{compareProduct.priceCheckedAt && ` · 확인 ${new Date(compareProduct.priceCheckedAt).toLocaleDateString("ko-KR")}`}</p>
          <p className="body-note">가격은 변동될 수 있어요. 할인·쿠폰·옵션·배송비를 포함한 최종 금액은 판매처에서 확인해 주세요.</p>
          <div className={`compare-notice ${comparison?.status ?? "loading"}`}><Icon name="spark" size={17}/><div><strong>{compareLoading ? "가격을 확인하는 중" : comparison?.status === "live" ? "온라인 검색 결과" : compareOffers.length ? "등록 판매처 가격" : "쇼핑몰 검색으로 확인"}</strong><p>{compareLoading ? "잠시만 기다려 주세요." : comparison?.status === "live" ? `조회 ${new Date(comparison.checkedAt!).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 배송비와 옵션은 판매처에서 확인해 주세요.` : comparison?.message}</p></div></div>
          <div className="compare-section-title"><div><span className="section-kicker">PRICE COMPARISON</span><h3>{compareOffers.length ? `판매 상품 ${compareOffers.length}개` : "온라인 가격 확인"}</h3></div><div className="compare-sort"><button type="button" className={sortBy === "unit" ? "active" : ""} aria-pressed={sortBy === "unit"} onClick={() => setSortBy("unit")}>{compareProduct.unit === "g" ? "100g당" : "1개당"}</button><button type="button" className={sortBy === "total" ? "active" : ""} aria-pressed={sortBy === "total"} onClick={() => setSortBy("total")}>상품가</button></div></div>
          {compareLoading ? <AppLoading message="쇼핑몰 가격을 비교하고 있어요"/> : compareOffers.length ? <div className="offer-list">{compareOffers.map((offer, index) => <div className="offer-row" key={offer.id}><div className="offer-rank">{index + 1}</div><div className="offer-main"><span className="offer-seller">{offer.seller}</span><strong>{offer.title}</strong><small>{offer.quantity && offer.unit ? `${offer.quantity.toLocaleString("ko-KR")}${offer.unit} · ` : "용량 확인 필요 · "}{offer.unitPrice !== null ? `${compareProduct.unit === "g" ? "100g당" : "1개당"} ${formatWon(offer.unitPrice)}` : "단위가격 미확인"}</small></div><div className="offer-action"><b>{formatWon(offer.price)}</b><a href={offer.url} target="_blank" rel="noopener noreferrer">{offer.isSearchLink ? "현재가 검색" : "상품 보기"} <Icon name="arrow" size={13}/></a></div></div>)}</div> : <div className="compare-empty">표시할 가격이 없어요. 아래 쇼핑몰 검색에서 직접 확인해 주세요.</div>}
          <div className="search-marketplaces"><div className="section-heading"><div><span className="section-kicker">LIVE SEARCH</span><h3>쇼핑몰에서 현재가 확인</h3></div></div><p>각 쇼핑몰의 실제 검색 결과가 새 창에서 열립니다.</p><div>{compareLinks.map((link) => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">{link.name}<Icon name="arrow" size={15}/></a>)}</div></div>
          <p className="compare-disclaimer">비교 결과의 상품 용량, 배송비, 할인 조건은 판매처마다 달라질 수 있습니다. 결제 전 상품 상세 정보를 확인하세요.</p>
        </>}
        {tab === "community" && <CommunityPanel key={authUser?.id ?? "guest"} userId={authUser?.id} products={products} budget={budget} onLogin={()=>setShowAuth(true)} onProfile={()=>setTab("profile")} onCart={()=>setTab("cart")}/>}
        {tab === "profile" && <><div className="page-intro"><div className="week-label">마이페이지</div><h2>{authUser?`${displayName}님의`:'나의'} <span>식사 취향</span></h2><p>내 몸과 생활에 맞게, 한 번만 설정해요.</p><Link className="profile-guide-link" href="/how-to">처음 오셨나요? 끼니플랜 소개·사용 가이드</Link></div><BodyProfilePanel key={authUser?.id ?? "guest"} userId={authUser?.id} name={displayName} onLogin={() => setShowAuth(true)}/><h3 className="profile-group-title">식비 관리</h3><details className="profile-extra"><summary>한 달 식비 예산</summary><BudgetSettings monthlyOnly key={`budget-${authUser?.id ?? "guest"}`} data={dashboard} userId={authUser?.id} onLogin={()=>setShowAuth(true)} onRefresh={refreshDashboard}/></details><h3 className="profile-group-title">도움이 필요할 때</h3><nav className="profile-menu" aria-label="도움말 및 관리"><Link href="/how-to"><span>처음이라면 · 끼니플랜 사용법</span><Icon name="chevron" size={16}/></Link><Link href="/submissions#mine"><span>내 제보와 검토 결과</span><Icon name="chevron" size={16}/></Link><a href="mailto:choisj2702@gmail.com"><span>문의·협업</span><Icon name="chevron" size={16}/></a></nav></> }
        {tab==='cart'&&<section className="home-guide-entry"><strong>상품·영양정보 제보</strong><Link href="/submissions">상품 정보 보완하기 →</Link></section>}
        {tab!=='home'&&<ServiceFeedback page={`/${tab}`}/>}
        {tab==='profile'&&<details className="home-explore"><summary>상품 비교·이용 안내</summary><ComparisonTrends/><nav aria-label="더 알아보기"><Link href="/products">상품 가격·영양 비교 <span>→</span></Link><Link href="/guides">식단·식비 가이드 <span>→</span></Link><Link href="/submissions">상품·영양정보 제보 <span>→</span></Link><a href="mailto:choisj2702@gmail.com">문의·협업 <span>↗</span></a></nav></details>}
        {tab==='profile'&&<details className="profile-extra profile-data"><summary>데이터 관리</summary><ResetData key={`reset-${authUser?.id??"guest"}`} userId={authUser?.id}/></details>}
        {(tab === 'home' || tab === 'profile') && <PolicyLinks/>}
      </div>
      {/* 식단공유(커뮤니티) 탭은 준비 중이라 메뉴에서 숨김 — /community 라우트 자체는 그대로 동작해요. */}
      <nav className="bottom-nav launch-nav" aria-label="앱 메뉴">{([ ["home","홈","home"], ["record","기록","edit"], ["profile","마이","user"] ] as [Tab,string,IconName][]).map(([key,label,icon]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}><Icon name={icon} size={21}/><span>{label}</span></button>)}</nav>
      </>}

    {showSetup && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowSetup(false)}><div className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" onMouseDown={(e) => e.stopPropagation()}>{dataError&&<p className="auth-error" role="alert">{dataError}</p>}<div className="modal-header"><div><span className="section-kicker">MY PLAN</span><h2 id="setup-title">내 목표 수정하기</h2></div><button type="button" onClick={() => setShowSetup(false)} aria-label="닫기"><Icon name="close" size={21}/></button></div><form onSubmit={saveSetup}><label htmlFor="budget">이번 주 식비 한도</label><div className="input-wrap"><input id="budget" type="number" min="1" max="10000000" required inputMode="numeric" value={draftBudget} onChange={(e) => setDraftBudget(e.target.value)}/><span>원</span></div><button className="primary-button" type="submit" disabled={savingBudget}>저장하고 계속하기 <Icon name="arrow" size={17}/></button></form></div></div>}
  </AppShell>;
}
