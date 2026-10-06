# 끼니플랜 디자인 가이드

화면을 새로 만들거나 고칠 때 이 문서를 따른다. 사용자 대부분은 **iPhone의 끼니플랜 앱(WebView)**으로 들어오므로, 모든 판단의 기준은 "390px 폭 화면을 엄지로 쓰는 사람"이다.

- 기준값: [app/tokens.css](../app/tokens.css)
- 공통 컴포넌트: [app/components/ui](../app/components/ui/index.tsx), 아이콘 [app/components/icons.tsx](../app/components/icons.tsx)
- 모바일 공통 보정: [app/mobile-polish.css](../app/mobile-polish.css), 창 뒤로가기·키보드: [app/dialog-history.tsx](../app/dialog-history.tsx)

## 1. 원칙

1. **한 화면에 주 행동 하나.** 가장 중요한 버튼만 `primary`로 만들고, 화면 맨 위쪽에 둔다. 나머지는 `secondary`·`ghost`.
2. **핵심 행동이 먼저, 안내는 나중.** 빈 상태 안내·면책 문구·설정이 주 행동을 아래로 밀어내면 안 된다.
3. **설명은 화면당 한 번.** 같은 면책·출처 문구를 카드마다 반복하지 않는다.
4. **위험한 행동은 맨 아래.** 전체 초기화 같은 행동은 화면 마지막 "위험 영역"에 둔다. 단, **회원 탈퇴는 App Store 심사 기준(5.1.1(v)) 때문에 마이 탭 맨 위**에 로그인한 사람에게 보이게 둔다.
5. **새 hex·px 값을 만들지 않는다.** 필요한 값이 없으면 `tokens.css`에 먼저 추가한다.

## 2. 색

| 변수 | 값 | 쓰임 |
|---|---|---|
| `--primary` | #526c47 | 주요 버튼, 강조 글씨(`<em>`) |
| `--primary-strong` | #46603c | hover·눌림, 보조 버튼 글씨 |
| `--primary-soft` | #edf2e5 | 보조 버튼 면, 선택된 칩 |
| `--text` | #33402c | 본문 |
| `--text-muted` | #4f5d46 | 진한 보조 글씨 |
| `--text-subtle` | #5f6b55 | 흐린 보조 글씨. **이보다 흐린 글씨색은 금지** |
| `--surface` / `--surface-soft` | #fffdf7 / #f3f6ed | 카드 면 / 안내 면 |
| `--border` | #e1e5d9 | 카드 테두리·구분선 |
| `--danger` | #c2492f | 삭제·탈퇴 버튼만 |

- 녹색은 올리브 계열(`--primary`) 하나만 쓴다. 청록(#24765a 등)은 새로 쓰지 않는다.
- 글씨 대비는 **4.5:1 이상**(큰 제목 3:1). 회색녹색 보조 글씨가 흐려 보이면 `--text-subtle`을 쓴다.
- 의미 없는 장식 색을 새로 만들지 않는다.

## 3. 글자

| 변수 | 크기 | 쓰임 |
|---|---|---|
| `--fs-2xl` | 28px | 페이지 제목 (`PageHeader`) |
| `--fs-xl` | 22px | 섹션 제목 |
| `--fs-lg` | 17px | 큰 버튼, 카드 제목 |
| `--fs-md` | 15px | 본문, 버튼 |
| `--fs-sm` | 13px | 안내문 |
| `--fs-xs` | 12px | 캡션 |

- **11px 미만 금지.** 보조 글씨도 12px 이상을 권장한다.
- **입력칸(input·select·textarea)은 16px 이상.** 16px 미만이면 iPhone이 포커스 때 화면을 확대한다. `mobile-polish.css`가 터치 기기에서 강제하지만, 처음부터 16px로 만든다.
- 제목 서체 KkiniRound(Jua)는 굵기가 하나뿐이다. `font-weight`를 주지 않는다.
- 한글 줄바꿈은 전역 `word-break: keep-all`. 끄지 않는다.

## 4. 모서리·간격·그림자

- 모서리: `--radius-sm`(10) 입력칸·작은 칩, `--radius-md`(14) 버튼, `--radius-lg`(20) 카드, `--radius-pill` 칩.
- 간격: `--space-1`~`--space-6` (4·8·12·16·24·32).
- 그림자: `--shadow-sm` 카드, `--shadow-md` 큰 주요 버튼. 그 외 그림자를 만들지 않는다.

## 5. 터치·모바일

- 누르는 모든 요소는 **44×44px 이상**(`--touch`). 아이콘이 작으면 `IconButton`처럼 보이는 크기는 두고 투명 영역으로 넓힌다.
- 하단 고정 요소는 `env(safe-area-inset-bottom)`을 더한다. 높이는 `vh` 대신 `dvh`.
- 창(모달)은 네이티브 `<dialog>` + `showModal()`로 만든다. 그러면 `DialogHistory`가 자동으로 처리한다:
  - 스와이프·뒤로 버튼 → 창의 `cancel` 이벤트 → 기존 `onCancel` 닫기 처리
  - iOS 키보드가 올라오면 창을 보이는 영역으로 올림
  - 뒤 화면 스크롤 잠금
  - 그러므로 `onCancel`에서 반드시 닫기(또는 저장 중이면 `preventDefault`)를 처리한다. `div`로 만든 가짜 모달은 새로 만들지 않는다.
- 앱 안에서는 팝업(`window.open`, Firebase popup)과 `target=_blank`가 동작하지 않을 수 있다. 앱 판별은 `lib/native-environment.ts`의 `isNativeApp` 하나만 쓴다.
- 호버에만 의존하는 UI를 만들지 않는다.

## 6. 공통 컴포넌트

```tsx
import {Button,LinkButton,IconButton,BackButton,Card,PageHeader,Notice} from './components/ui';
```

| 컴포넌트 | 언제 | 예 |
|---|---|---|
| `Button` | 화면 안 행동. `variant`: primary(주 행동 1개) · secondary · ghost · danger(되돌릴 수 없는 행동만). `size`: sm·md·lg. `block`은 전체 폭 | `<Button size="lg" block onClick={...}>오늘 식단 추천받기</Button>` |
| `LinkButton` | 다른 화면으로 이동하는 버튼 | `<LinkButton href="/record">한 끼 기록하기</LinkButton>` |
| `IconButton` | 닫기·삭제 같은 아이콘 버튼. `label` 필수 | `<IconButton icon="close" label="닫기" onClick={onClose}/>` |
| `BackButton` | 하단 탭에 없는 화면의 뒤로 가기. 문구는 **목적지 이름** | `<BackButton onClick={()=>setTab('home')}>식단으로</BackButton>` |
| `Card` | 내용 묶음. `tone`: default · soft(안내) · danger(위험 영역) | `<Card tone="soft">…</Card>` |
| `PageHeader` | 페이지 맨 위 제목. 제목 속 `<em>`이 강조색 | `<PageHeader kicker="장보기" icon="bag" title={<>이번에 <em>살 것</em></>} description="…"/>` |
| `Notice` | 상태 안내. `tone`: info · success · warning · error. error는 `role=alert` | `<Notice tone="error" action={<Button size="sm" variant="secondary">다시 시도</Button>}>…</Notice>` |
| `WaitHint` (`app/wait-hint.tsx`) | 5초 넘게 걸리는 AI 분석 대기. 시간이 지나면 안내가 바뀐다 | `{busy&&<WaitHint/>}` |
| `Icon` (`app/components/icons.tsx`) | 선 아이콘. 새 아이콘은 여기에 path를 추가 | `<Icon name="check" size={18}/>` |

- `app/` 아래에서는 `icon`·`apple-icon`·`opengraph-image`·`sitemap` 같은 파일명을 컴포넌트에 쓰지 않는다. Next.js가 메타데이터 파일로 처리해 빌드가 깨진다.
- 기존 `.primary-button` 클래스는 레거시다. `mobile-polish.css`가 색만 `--primary`로 맞춰 둔 상태이며, 손대는 화면부터 `Button`으로 바꾼다.
- 이모지를 아이콘처럼 쓰지 않는다(✓ ✕ 🗓 등). `Icon`을 쓰고, 없으면 추가한다. 끼니 표시(☀️🌤️🌙)처럼 내용의 일부인 이모지는 허용.

## 7. 상태 화면

| 상태 | 규칙 |
|---|---|
| 빈 상태 | 한 줄 설명 + 다음 행동 버튼 하나. 다른 탭으로 보내지 말고 그 자리에서 할 수 있게 한다. 예: "첫 끼를 사진 한 장으로 남겨 보세요. [사진으로 기록]" |
| 로딩 | 무엇을 기다리는지 말한다("식단을 불러오고 있어요…"). 5초 이상이면 `WaitHint`. 버튼은 진행형 문구 + `disabled` |
| 오류 | 서버·영문 메시지를 그대로 보여주지 않는다. "무엇이 안 됐는지 + 할 수 있는 일"을 쓰고 가능하면 [다시 시도]. `Notice tone="error"` |
| 성공 | 무엇이 어디에 저장됐는지 짧게. 예: "점심을 기록했어요 · 520kcal" |
| 위험 확인 | 되돌릴 수 없는 일(탈퇴·전체 초기화)만 확인 문구 입력. 일반 삭제는 확인 단계 없이 처리하고 되돌리기를 제공. `window.confirm` 금지(앱에서 어색함) |

## 8. 문구

- **해요체 하나.** "~합니다", "~됩니다"를 쓰지 않는다.
- **같은 행동은 같은 이름.**

| 행동 | 쓰는 말 | 쓰지 않는 말 |
|---|---|---|
| 처음 추천받기 | 오늘 식단 추천받기 / 내 식단 추천받기 | 추천받아 채우기, 오늘 먹을 메뉴 찾기 |
| 다시 추천 | 다른 식단 추천받기 | |
| 고른 메뉴를 먹음 | 먹었어요 | 이거 먹었어요 |
| 기록하러 가기 | 한 끼 기록하기 | 먹은 음식 기록하기, 오늘 한 끼 기록하기 |
| 기록 모음(명사) | 식사 일기 | 먹은 기록, 영양 기록 |
| 뒤로 | (목적지)으로 — 식단으로 | 돌아가기, 처음으로, ← 이전 |

- 내부 용어를 쓰지 않는다: 카탈로그 → 상품, 판매 묶음 → 판매 단위, 회분(먹은 양) → 인분. 영양표의 "1회분"은 그대로 둔다.
- 금액·영양 면책은 화면당 한 줄. 예: "1인분 재료비(예상) · 집에 있는 재료는 빼지 않았어요".

## 9. 접근성

- 포커스는 `:focus-visible { outline: 3px solid var(--focus) }`. `outline: none`만 쓰고 대체 표시를 안 하는 것은 금지.
- 클릭 요소는 `button`·`a`. `div onClick` 금지.
- 아이콘만 있는 버튼에는 `aria-label`. 장식 아이콘은 `aria-hidden`.
- 켜기/끄기는 `role="switch"` + `aria-checked`, 또는 체크박스. 한 화면에서 섞지 않는다.
- 움직임은 `@media (prefers-reduced-motion: no-preference)` 안에서만 켠다.
- 하단 탭에 없는 화면은 상위 탭이 켜져 있어야 한다(`page.tsx`의 `navSection`).

## 10. 레거시 정리 방향

지금 `app/` CSS에는 여러 시기의 디자인이 겹쳐 있다(고유 hex 약 2,600개, `.primary-button` 재정의 12곳, `fresh-theme.css`·`home-readability.css`의 깊은 덮어쓰기 선택자). 한 번에 갈아엎지 않고:

1. 화면을 고칠 때마다 그 화면의 버튼·카드·제목을 공통 컴포넌트로 바꾼다.
2. 바꾼 화면의 hex·px는 토큰으로 치환한다.
3. 더 이상 쓰지 않는 레거시 선택자는 지운다.
4. 토큰화가 충분히 되면 `prefers-color-scheme: dark`에서 토큰만 다시 정의해 다크모드를 붙인다.

`/intro`, `/convenience`는 아직 본편과 셸(헤더·로고·서체)이 다르다. 다음 정리 대상이다.

## 11. 화면 분류·정보 우선순위

하단 메뉴는 사용자가 하려는 일에 따라 구분한다. 기능을 추가할 때 홈에 모두 펼치지 않고 해당 영역에 둔다.

| 영역 | 먼저 보여줄 일 | 상세·보조 기능 |
|---|---|---|
| 오늘 | 오늘 식단 추천·선택한 메뉴 확인 | 한 끼 기록하기, 외식·편의점 선택, 기록 습관 |
| 식단 | 미리 식단 짜기 | 식단 달력, 이번 주 식단 가이드 |
| 장보기 | 살 재료 확인 | 상품 찾기·가격 비교, 내 재료, 공유받은 목록 |
| 기록 | 한 끼 기록하기·날짜별 식사 일기 | 하루 영양 합계, 식비, 물·체중, 내 재료로 만든 식사 이력 |
| 마이 | 내 정보·목표 수정 | 식사 알림, 식사 습관 피드백, 끼니·배지, 예산·계정 설정 |

- 내 재료·상품 비교 화면에서는 **장보기**, 외식·편의점에서는 **오늘** 하단 탭을 켠다.
- 홈은 **추천 → 기록 → 다른 식사 방법** 순서로 보여준다. 설치 안내와 주간 피드백은 그 뒤에 둔다.
- 상세 정보는 내용을 알 수 있는 제목의 접기 영역으로 묶는다. 핵심 행동과 회원 탈퇴는 접지 않는다.
- 접힌 영역 안으로 연결하는 링크는 해당 영역을 펼친 뒤 목적지로 이동한다.

## 체크리스트 (PR 전)

- [ ] 주 행동이 primary 하나이고 화면 위쪽에 있다
- [ ] 새 hex·px 대신 토큰을 썼다
- [ ] 글씨 11px 이상, 대비 4.5:1 이상
- [ ] 입력칸 16px 이상, 터치 영역 44px 이상
- [ ] 창은 `<dialog>`이고 `onCancel`로 닫힌다
- [ ] 빈·로딩·오류·성공 상태 문구가 위 규칙을 따른다
- [ ] 해요체, 동사 사전과 같은 이름
- [ ] 390px 폭에서 가로 스크롤이 없다
