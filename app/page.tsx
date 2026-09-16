"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";
import { MonthlyPlanner } from "./monthly-planner";
import { Dashboard } from "./dashboard";
import { ShoppingPlanner } from "./shopping-planner";
import type { DashboardData } from "../lib/dashboard";
import { AuthScreen } from "./auth-screen";
import { CommunityPanel, SharedBasket } from "./community";
import { BudgetSettings } from "./budget-settings";
import { BodyProfilePanel } from "./body-profile";
import { RiceBuddy } from "./rice-buddy";
import { googleAuthErrors, type GoogleAuthErrorCode } from "../lib/auth-messages";
import type { PublicUser } from "../lib/auth";
import { catalogCategories, shoppingSearchLinks, unitPrice, type CatalogItem, type CompareResponse } from "../lib/catalog";
import { ProductThumb } from "./product-thumb";
import { CatalogFilter } from "./catalog-filter";
import { AppLoading, useLoadingTask } from "./app-loading";

type Tab = "community" | "home" | "calendar" | "cart" | "compare" | "record" | "profile";
type IconName = "home" | "bag" | "chart" | "user" | "chevron" | "arrow" | "check" | "spark" | "calendar" | "wallet" | "fire" | "close" | "edit" | "left";

const formatWon = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

function Icon({ name, size = 20, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
    bag: <><path d="M4 8h16l-1.3 12H5.3L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    chart: <><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    left: <path d="m15 18-6-6 6-6"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13m-1 12h4m-3 0h.01"/></>,
    fire: <path d="M12 22c4.5 0 7-3.2 7-7 0-2.5-1.2-4.4-3-6-1 2-2 2.5-2 2.5C14 7 12 4.5 10 2c.5 4-1 5.5-3 7.5C5.5 11 5 12.8 5 15c0 3.8 2.5 7 7 7Z"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    edit: <><path d="m4 20 4-.8L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/><path d="m15 6 3 3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="끼니플랜 홈으로" style={{textDecoration:"none"}} className={`brand ${light ? "brand-light" : ""}`}><span className="brand-mark"><span/><span/><span/><span/></span><span>끼니플랜<span className="brand-dot">.</span></span></Link>;
}

export default function Home() {
  const [profileRevision,setProfileRevision]=useState(0);
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
  useEffect(()=>{contentRef.current?.scrollTo({top:0});},[tab]);
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
  const weeklyProducts = products.filter((product) => product.inWeeklyCart);
  const otherProducts = products.filter((product) => !product.inWeeklyCart && (catalogCategory === "all" || product.category === catalogCategory) && `${product.name} ${product.detail}`.toLocaleLowerCase().includes(catalogQuery.trim().toLocaleLowerCase()));
  const compareProduct = products.find((product) => product.id === compareProductId);
  const compareOffers = [...(comparison?.offers ?? [])].sort((a, b) => sortBy === "unit" ? (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY) || a.price - b.price : a.price - b.price);
  const compareLinks = shoppingSearchLinks(compareProduct?.searchQuery ?? "");
  const openCompare = (itemId: string) => { setComparison(null); setCompareLoading(true); setSortBy("unit"); router.push(`/compare/${encodeURIComponent(itemId)}`); };
  async function refreshDashboard(){const r=await fetch("/api/dashboard",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setDashboard(d);}
  const editBudget=()=>{if(!authUser){setShowAuth(true);return;}setDraftBudget(dashboard?.budget?.toString()??"");setShowSetup(true);};
  async function saveSetup(event:React.FormEvent){event.preventDefault();setSavingBudget(true);setDataError("");try{const r=await fetch("/api/dashboard",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"budget",amount:Number(draftBudget)})});const d=await r.json();if(!r.ok)throw new Error(d.error);await refreshDashboard();setShowSetup(false);}catch(e){setDataError(e instanceof Error?e.message:"저장하지 못했어요.");}finally{setSavingBudget(false);}}
  const displayName = authUser?.name ?? "나";

  useEffect(() => {
    const controller=new AbortController();
    const reload=()=>{
      const finish = startLoading("식단과 장바구니를 준비하고 있어요");
      const catalogRequest = fetch("/api/catalog",{cache:"no-store",signal:controller.signal}).then(async response=>{
        const catalog=await response.json();
        if(!response.ok)throw new Error("상품 연결 실패");
        if(!controller.signal.aborted){setProducts(catalog.items ?? []);setCatalogError("");setCatalogLoaded(true);}
      }).catch(()=>{if(!controller.signal.aborted){setProducts([]);setCatalogLoaded(true);setCatalogError("상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");}});
      const dashboardRequest = fetch("/api/dashboard",{cache:"no-store",signal:controller.signal}).then(async response=>{
        const dash=await response.json();
        if(!response.ok)throw new Error(dash.error??"식단을 불러오지 못했어요.");
        if(!controller.signal.aborted){setDashboard(dash);setDataError("");}
      }).catch(e=>{if(!controller.signal.aborted){setDashboard(null);setDataError(e.message);}});
      void Promise.allSettled([catalogRequest,dashboardRequest]).finally(finish);
    };
    reload();window.addEventListener("focus",reload);
    return()=>{controller.abort();window.removeEventListener("focus",reload);};
  },[authUser?.id,tab,startLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const finish = startLoading("로그인 상태를 확인하고 있어요");
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { user: PublicUser | null; error?: string };
        if (!response.ok) throw new Error(data.error ?? "로그인 상태를 확인할 수 없습니다.");
        setAuthUser(data.user);
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
  }, [startLoading]);

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

  return <main className="site-shell">
    {savingBudget && <AppLoading message="이번 주 예산을 저장하고 있어요"/>}
    <aside className="promo-panel" aria-label="끼니플랜 서비스 소개"><div className="promo-inner">
      <div className="promo-top"><Brand light/><span>MY WEEK, MY TABLE</span></div>
      <div className="promo-copy"><div className="eyebrow">혼자 사는 한 주도 잘 먹기 위한 계획</div><h1>장보기부터 식단까지,<br/><em>가볍게 챙겨요.</em></h1><p>냉동식품부터 밀키트까지 골라<br/>일주일 살 것과 먹을 순서를 정해요.<br/>바쁜 일상에도 내 끼니는 놓치지 않게.</p><div className="promo-rule"><span>내 예산에 맞게</span><span>매일 맛있게</span><span>다음 주는 더 쉽게</span></div></div>
      <div className="promo-playground"><span className="promo-sticker sticker-one">잘 먹고 🥄</span><span className="promo-sticker sticker-two">조금씩 아끼고 🌱</span><div className="promo-buddy-circle"><RiceBuddy/></div><span className="promo-veggie veggie-one">🥦</span><span className="promo-veggie veggie-two">🍅</span><div className="promo-character-caption">밥 친구 끼니랑, 매일 한 끼씩.</div></div>
      <div className="promo-footer"><span>© 끼니플랜</span><span>GOOD FOOD, GOOD WEEK</span></div>
    </div></aside>
    <section className="app-side" aria-label="끼니플랜 앱"><div className="app-frame">
      {showAuth ? <AuthScreen initialError={authError} onExplore={() => { setShowAuth(false); setAuthError(""); }} onSuccess={(user) => { setDashboard(null); setAuthUser(user); setAuthError(""); setShowAuth(false); setTab("home"); }}/> : <>
      <header className="app-header"><Brand/><div className="app-header-actions">{authUser ? <button className="logout-link" type="button" onClick={signOut}>로그아웃</button> : <button className="logout-link" type="button" onClick={() => { setAuthError(""); setShowAuth(true); }}>로그인</button>}<button className="avatar" type="button" onClick={() => setTab("profile")} aria-label="내 정보 보기">{displayName.slice(0, 1)}</button></div></header>
      <div className="app-content" ref={contentRef}>
        {tab === "home" && <ShoppingPlanner userId={authUser?.id} onLogin={()=>setShowAuth(true)}/>}
        {tab === "home" && <section className="home-guide-entry"><strong>자취 식단과 식비, 함께 계획해요</strong><p>일주일 식비 예산부터 1인 가구 장보기 리스트까지.</p><Link href="/guides">자취 식생활 가이드 읽기 →</Link></section>}
        {authError && <p className="auth-inline-error" role="alert">{authError}</p>}
        {dataError&&<p className="auth-error" role="alert">{dataError}</p>}

        {(tab==="home"||tab==="cart"||tab==="compare") && catalogError && <p className="auth-error" role="alert">{catalogError}</p>}
        {(tab==="home"||tab==="cart") && catalogLoaded && !catalogError && products.length===0 && <p className="body-note">등록된 상품이 없습니다.</p>}
        {tab==="compare" && catalogLoaded && !catalogError && !compareProduct && <p className="body-note">상품을 찾을 수 없습니다.</p>}
        {tab === "record" && dashboard && <Dashboard key={`${authUser?.id??"guest"}-${tab}`} mode={tab} data={dashboard} userId={authUser?.id} products={products} onLogin={()=>setShowAuth(true)} onProfile={()=>setTab("profile")} onCart={()=>setTab("cart")} onCalendar={()=>setTab("calendar")} onBudget={editBudget} onRefresh={refreshDashboard} onCompare={openCompare}/>}
        {tab === "calendar" && <><MonthlyPlanner key={`month-${authUser?.id??"guest"}`} userId={authUser?.id} onLogin={()=>setShowAuth(true)}/>{dashboard&&<details><summary>지출 기록·기존 하루 식단 보기</summary><Dashboard key={`${authUser?.id??"guest"}-calendar`} mode="calendar" data={dashboard} userId={authUser?.id} products={products} onLogin={()=>setShowAuth(true)} onProfile={()=>setTab("profile")} onCart={()=>setTab("cart")} onCalendar={()=>setTab("calendar")} onBudget={editBudget} onRefresh={refreshDashboard} onCompare={openCompare}/></details>}</>}
        {tab === "cart" && <>
          <ShoppingPlanner mode="cart" userId={authUser?.id} onLogin={()=>setShowAuth(true)}/><details><summary>직접 요리할 식단의 재료 보기</summary><MonthlyPlanner key={`ingredients-${authUser?.id??"guest"}`} mode="cart" userId={authUser?.id} onLogin={()=>setShowAuth(true)}/></details>
          <SharedBasket key={authUser?.id ?? "guest"} userId={authUser?.id} onCompare={openCompare}/>
          <div className="page-intro"><div className="week-label"><Icon name="bag" size={15}/> 판매 상품 카탈로그</div><h2>식탁을 채울 <span>장바구니</span></h2><p>식재료와 밀키트, 냉동식품을 눌러 가격과 영양 정보를 확인해 보세요.</p></div>
          <div className="list-heading"><h3>등록된 식재료 <span>{weeklyProducts.length}</span></h3><small>눌러서 판매처 비교</small></div>
          <div className="food-list">{weeklyProducts.map((food) => <button key={food.id} type="button" className="food-row comparison-entry" onClick={() => openCompare(food.id)}><ProductThumb item={food}/><span className="food-meta"><strong>{food.name}</strong><small>{catalogCategories[food.category]} · {food.detail}</small><em>{(food.nutritionSourceUrl || food.nutritionPhotoUrl) && food.proteinG !== null ? `단백질 ${food.proteinG}g / ${food.nutritionBasis}` : "영양 정보 확인 중"}</em></span><span className="food-price"><strong>{formatWon(food.price)}{food.priceNote?.includes("시작가") ? "~" : ""}</strong><small>{food.unit === "g" ? "100g당" : "1개당"} {formatWon(unitPrice(food.price, food.quantity, food.unit))}</small></span><Icon name="chevron" size={17}/></button>)}</div>
          <p className="body-note">추가 상품 검색</p>
          <CatalogFilter query={catalogQuery} category={catalogCategory} onQuery={setCatalogQuery} onCategory={setCatalogCategory}/>
          {catalogLoaded && !catalogError && products.length > 0 && otherProducts.length === 0 && <p className="body-note">검색 결과가 없습니다.</p>}
          {otherProducts.length > 0 && <><div className="list-heading"><h3>다른 상품 둘러보기 <span>{otherProducts.length}</span></h3><small>밀키트 · 냉동식품 · 간편식</small></div><div className="food-list">{otherProducts.map((food) => <button key={food.id} type="button" className="food-row comparison-entry" onClick={() => openCompare(food.id)}><ProductThumb item={food}/><span className="food-meta"><strong>{food.name}</strong><small>{catalogCategories[food.category]} · {food.detail}</small><em>{(food.nutritionSourceUrl || food.nutritionPhotoUrl) && food.proteinG !== null ? `단백질 ${food.proteinG}g / ${food.nutritionBasis}` : "영양 정보 확인 중"}</em></span><span className="food-price"><strong>{formatWon(food.price)}{food.priceNote?.includes("시작가") ? "~" : ""}</strong><small>{food.unit === "g" ? "100g당" : "1개당"} {formatWon(unitPrice(food.price, food.quantity, food.unit))}</small></span><Icon name="chevron" size={17}/></button>)}</div></>}
          <div className="cart-note"><Icon name="spark" size={17}/><p>판매 페이지에서 확인한 가격이에요. 구매 전 옵션·배송비·현재 가격을 확인해 주세요.</p></div>
        </>}

        {tab === "compare" && compareProduct && <>
          <button className="compare-back" type="button" onClick={() => setTab("cart")}><Icon name="left" size={17}/> 장바구니로 돌아가기</button>
          <div className="page-intro compare-intro"><div className="week-label"><Icon name="bag" size={15}/> 상품 온라인 가격 비교</div><h2>{compareProduct.name} <span>비교</span></h2><p>상품별 가격과 용량을 같은 기준으로 살펴봐요.</p></div>
          <div className="compare-product"><ProductThumb item={compareProduct}/><div><strong>{compareProduct.name}</strong><span>판매 구성 {compareProduct.detail}</span></div></div>
          {(compareProduct.productUrl || compareProduct.nutritionSourceUrl || compareProduct.nutritionPhotoUrl) && <div className="catalog-sources">{compareProduct.productUrl && <a href={compareProduct.productUrl} target="_blank" rel="noopener noreferrer">등록된 상품 페이지 ↗</a>}{compareProduct.nutritionSourceUrl && <a href={compareProduct.nutritionSourceUrl} target="_blank" rel="noopener noreferrer">영양 정보 원문 · {compareProduct.nutritionSourceName} ↗</a>}{compareProduct.nutritionPhotoUrl && <a href={compareProduct.nutritionPhotoUrl} target="_blank" rel="noopener noreferrer">영양표 사진 ↗</a>}</div>}
          {(compareProduct.nutritionSourceUrl || compareProduct.nutritionPhotoUrl) && [compareProduct.caloriesKcal, compareProduct.proteinG, compareProduct.carbohydratesG, compareProduct.fatG, compareProduct.sodiumMg].some((value) => value !== null) && <div className="nutrition-panel"><strong>영양 정보 <small>{compareProduct.nutritionBasis} 기준</small></strong><div>{[["열량",compareProduct.caloriesKcal,"kcal"],["단백질",compareProduct.proteinG,"g"],["탄수화물",compareProduct.carbohydratesG,"g"],["지방",compareProduct.fatG,"g"],["나트륨",compareProduct.sodiumMg,"mg"]].filter((entry) => entry[1] !== null).map(([label,value,unit]) => <span key={label}>{label} <b>{value}{unit}</b></span>)}</div></div>}
          <p className="body-note">등록 가격 {formatWon(compareProduct.price)} · {compareProduct.priceNote ?? "관리자 등록 가격"}{compareProduct.priceCheckedAt && ` · 확인 ${new Date(compareProduct.priceCheckedAt).toLocaleDateString("ko-KR")}`}</p>
          <div className={`compare-notice ${comparison?.status ?? "loading"}`}><Icon name="spark" size={17}/><div><strong>{compareLoading ? "가격을 확인하는 중" : comparison?.status === "live" ? "온라인 검색 결과" : compareOffers.length ? "등록 판매처 가격" : "쇼핑몰 검색으로 확인"}</strong><p>{compareLoading ? "잠시만 기다려 주세요." : comparison?.status === "live" ? `조회 ${new Date(comparison.checkedAt!).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 배송비와 옵션은 판매처에서 확인해 주세요.` : comparison?.message}</p></div></div>
          <div className="compare-section-title"><div><span className="section-kicker">PRICE COMPARISON</span><h3>{compareOffers.length ? `판매 상품 ${compareOffers.length}개` : "온라인 가격 확인"}</h3></div><div className="compare-sort"><button type="button" className={sortBy === "unit" ? "active" : ""} aria-pressed={sortBy === "unit"} onClick={() => setSortBy("unit")}>{compareProduct.unit === "g" ? "100g당" : "1개당"}</button><button type="button" className={sortBy === "total" ? "active" : ""} aria-pressed={sortBy === "total"} onClick={() => setSortBy("total")}>상품가</button></div></div>
          {compareLoading ? <AppLoading message="쇼핑몰 가격을 비교하고 있어요"/> : compareOffers.length ? <div className="offer-list">{compareOffers.map((offer, index) => <div className="offer-row" key={offer.id}><div className="offer-rank">{index + 1}</div><div className="offer-main"><span className="offer-seller">{offer.seller}</span><strong>{offer.title}</strong><small>{offer.quantity && offer.unit ? `${offer.quantity.toLocaleString("ko-KR")}${offer.unit} · ` : "용량 확인 필요 · "}{offer.unitPrice !== null ? `${compareProduct.unit === "g" ? "100g당" : "1개당"} ${formatWon(offer.unitPrice)}` : "단위가격 미확인"}</small></div><div className="offer-action"><b>{formatWon(offer.price)}</b><a href={offer.url} target="_blank" rel="noopener noreferrer">{offer.isSearchLink ? "현재가 검색" : "상품 보기"} <Icon name="arrow" size={13}/></a></div></div>)}</div> : <div className="compare-empty">표시할 가격이 없어요. 아래 쇼핑몰 검색에서 직접 확인해 주세요.</div>}
          <div className="search-marketplaces"><div className="section-heading"><div><span className="section-kicker">LIVE SEARCH</span><h3>쇼핑몰에서 현재가 확인</h3></div></div><p>각 쇼핑몰의 실제 검색 결과가 새 창에서 열립니다.</p><div>{compareLinks.map((link) => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">{link.name}<Icon name="arrow" size={15}/></a>)}</div></div>
          <p className="compare-disclaimer">비교 결과의 상품 용량, 배송비, 할인 조건은 판매처마다 달라질 수 있습니다. 결제 전 상품 상세 정보를 확인하세요.</p>
        </>}
        {tab === "community" && <CommunityPanel key={authUser?.id ?? "guest"} userId={authUser?.id} products={products} budget={budget} onLogin={()=>setShowAuth(true)} onProfile={()=>setTab("profile")} onCart={()=>setTab("cart")}/>}
        {tab === "profile" && <><div className="page-intro"><div className="week-label">MY SHOPPING</div><h2>{displayName}님의 <span>장보기 취향</span></h2><p>내 생활에 맞는 끼니만, 예산 안에서 간편하게.</p></div><BodyProfilePanel onSaved={()=>setProfileRevision(n=>n+1)} key={authUser?.id ?? "guest"} userId={authUser?.id} name={displayName} onLogin={() => setShowAuth(true)}/><ShoppingPlanner key={`preferences-${authUser?.id??"guest"}-${profileRevision}`} mode="settings" userId={authUser?.id} onLogin={()=>setShowAuth(true)}/><details className="profile-extra"><summary>월 식비 예산·지출 관리</summary><BudgetSettings monthlyOnly key={`budget-${authUser?.id ?? "guest"}`} data={dashboard} userId={authUser?.id} onLogin={()=>setShowAuth(true)} onRefresh={refreshDashboard}/></details></> }
      </div>
      <nav className="bottom-nav" aria-label="앱 메뉴">{([ ["home","홈","home"], ["calendar","달력","calendar"], ["cart","장바구니","bag"], ["record","기록","chart"], ["community","함께","spark"], ["profile","마이","user"] ] as [Tab,string,IconName][]).map(([key,label,icon]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}><Icon name={icon} size={21}/><span>{label}</span></button>)}</nav>
      </>}
    </div></section>
    {showSetup && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowSetup(false)}><div className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" onMouseDown={(e) => e.stopPropagation()}>{dataError&&<p className="auth-error" role="alert">{dataError}</p>}<div className="modal-header"><div><span className="section-kicker">MY PLAN</span><h2 id="setup-title">내 목표 수정하기</h2></div><button type="button" onClick={() => setShowSetup(false)} aria-label="닫기"><Icon name="close" size={21}/></button></div><form onSubmit={saveSetup}><label htmlFor="budget">이번 주 식비 한도</label><div className="input-wrap"><input id="budget" type="number" min="1" max="10000000" required inputMode="numeric" value={draftBudget} onChange={(e) => setDraftBudget(e.target.value)}/><span>원</span></div><button className="primary-button" type="submit" disabled={savingBudget}>저장하고 계속하기 <Icon name="arrow" size={17}/></button></form></div></div>}
  </main>;
}
