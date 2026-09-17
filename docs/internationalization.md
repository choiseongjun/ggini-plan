# 다국가 DB/API 확장 기반

이번 범위는 DB/API 기반이다. 현재 웹 화면과 기존 추천·구매·섭취 API는 한국(KR/KRW) 서비스로 유지한다. 일본어 화면 전체 번역, 일본 판매 상품 수집, 일본 추천 엔진 활성화, 현지 판매처 주문 연동은 포함하지 않는다. 일본은 `preview`이며 허위 상품·가격·번역은 채우지 않는다.

## 독립적으로 관리하는 값

- `market`: 판매 국가. `KR`, `JP`. 언어 또는 IP로 추측하지 않는다.
- `currency`: 금액의 통화. 국가의 기본 통화와 일치해야 한다. 환율 변환은 하지 않는다.
- `locale`: 표시 언어. 일본에서 한국어를 쓰는 사용자도 가능하다.
- `timeZone`: IANA 시간대. UTC 저장 시각과 사용자가 선택한 현지 날짜를 구분한다.
- `amountMinor`: 통화의 최소 단위 정수. KRW 1,000 = 1,000원, JPY 1,000 = 1,000엔, USD 1,000 = 10달러. 단순 통화기호 교체 금지.

## 테이블

| 영역 | 테이블 | 규칙 |
|---|---|---|
| 기준정보 | `currencies`, `locales`, `markets`, `market_locales` | KR 활성, JP 준비. 국가·통화 복합 FK |
| 사용자 | `user_regions` | 기본 국가, 언어, 시간대. 기존 화면을 일본 모드로 바꾸지는 않음 |
| 상품 원본 | `catalog_items` | 출처 국가·원본 언어·통화 명시, 기존 ID 보존 |
| 번역 | `catalog_translations` | 상품×언어. 번역이 없으면 원문과 fallback 표시 |
| 판매처 | `market_sellers`, `catalog_offers` | 국가별 판매자 SKU, 가격·배송비·세금 여부·재고·출처·확인시각 |
| 분량 | `catalog_serving_profiles` | 문자열의 '인분'을 파싱하지 않아도 회분·그램·끼니를 저장 가능 |
| 재료 | `food_ingredients`, `ingredient_translations`, `catalog_allergen_evidence` | 언어와 무관한 코드, 번역 이름, 원문 근거와 확인 상태. 법정 알레르기 목록을 의미하지 않음 |
| 식비 | `daily_expenses`, `weekly_budgets`, `monthly_budgets` | PK에 국가·통화 포함. 같은 날짜의 원화와 엔화 기록 공존 |
| 기록 스냅샷 | 기존 식단·구매·섭취 테이블 | 국가·통화 추가, 식단·섭취에는 언어·시간대도 보존 |
| 해외 식단 작업공간 | `market_workspaces`, `market_inventory`, `market_plan_meals`, `market_meal_intakes` | 사용자×국가 분리, 상품별 재고, 날짜×끼니별 계획·섭취. 추가 섭취는 `additional`로 명시 |

기존 한국 재고 JSON, 추천 결과 JSON, 공유 스냅샷은 소급 변환하지 않는다. 해외 구조는 정규화 테이블을 사용한다. 기존 한국 식사 기록에 날짜·끼니 중복 제한을 소급 적용한 것은 아니다. 그 연결은 별도 전환이 필요하다.

판매 묶음·중량·성분이 다르면 같은 상품 이름이어도 별도 `catalog_items.id`를 사용한다. 같은 포장의 판매처별 가격만 `catalog_offers`에서 비교한다. 배송비 미확인은 NULL이며 0원과 구분한다. 기존 가격은 `price_checked_at`이 있는 경우에만 판매 제안으로 이관하며 재고 상태는 `unknown`으로 둔다. 이관은 1회 스냅샷이므로 이후 수집기는 제안 가격과 확인시각을 별도로 갱신해야 한다.

## API

| 요청 | 기능 |
|---|---|
| `GET /api/markets` | 지원 국가, 통화 소수자리, 언어, 시간대, 출시 상태 |
| `GET /api/region` | 내 지역 설정, 비회원은 한국 기본값 |
| `PUT /api/region` | 로그인 필요. `{market,locale,timeZone}` 저장 |
| `GET /api/catalog?market=JP&locale=ja-JP` | 해당 국가 원본 카탈로그. 한국 상품으로 대체하지 않음 |
| `GET /api/catalog/offers?market=JP&product=PRODUCT_ID` | 해당 상품의 일본 판매 제안만 조회. 다른 나라 상품도 일본 판매 제안이 별도로 있어야 노출 |
| `GET /api/ingredients?market=JP&locale=ja-JP` | 언어별 재료 이름과 안정적인 재료 코드 |
| `GET /api/regional/expenses?market=JP&from=2026-09-01&to=2026-09-30` | 계정·국가·통화별 식비/생활비 조회. 최대 366일 |
| `PUT /api/regional/expenses` | `{market:"JP",currency:"JPY",date:"2026-09-17",category:"food",amountMinor:850}`. 해당 날짜·항목 합계 설정, 누적 추가가 아님 |
| `GET /api/regional/budgets?market=JP&period=month&start=2026-09-01` | 국가별 예산 조회 |
| `PUT /api/regional/budgets` | `{market:"JP",currency:"JPY",period:"month",start:"2026-09-01",amountMinor:30000}`. 주간은 월요일, 월간은 1일부터 |

식비 API는 market 생략 시 사용자의 지역 설정을 사용한다. 명시적 market 요청은 해당 시장의 시간대를 사용한다. 기존 `/api/dashboard`, `/api/shopping-plan`, `/api/food-intake`, `/api/compare`는 한국 전용이다. 일본의 `preview` 상태에서도 DB/API 검증용 식비·예산·언어 설정은 가능하지만, 이것이 일본 추천/배송 서비스 개통을 의미하지 않는다.

판매 제안의 BIGINT 금액은 JSON 문자열로 반환한다. 기존 일별 식비/예산은 정수형의 제한(최소단위 1,000만)을 유지한다. 환산 합계가 필요하다면 별도 환율 출처·기준시각·원통화 금액을 저장하는 기능을 먼저 설계해야 한다.

전체 초기화는 해외 작업공간, 해외 식비·예산, 지역 선호까지 초기화한다. 계정·로그인·커뮤니티 활동은 유지한다.

## 마이그레이션과 배포

기존 데이터는 KR/KRW/ko-KR/Asia/Seoul로 보존하며 금액 숫자를 바꾸지 않는다. **운영 DB에는 아직 적용하지 않았다.** 격리된 테스트 스키마에서 기존 데이터 보존 및 반복 적용을 검증한다.

```sh
# 기존 DB용, 기본은 트랜잭션 롤백으로 검증만 수행
node --env-file=.env.local scripts/migrate-internationalization.mjs
# 검증 후 실제 적용
node --env-file=.env.local scripts/migrate-internationalization.mjs --apply
# 새 DB는 기존 명령이 기본 스키마와 국제화 스키마를 함께 적용
npm run db:migrate
```

금액 테이블의 PK가 변경되므로 구버전 서버의 ON CONFLICT 구문과 호환되지 않는다. 배포 시 쓰기를 잠시 중지하고 마이그레이션과 새 서버 배포를 함께 수행한 뒤 쓰기를 재개한다. 이전 앱으로 코드만 롤백하면 안 된다. 마이그레이션 전 백업을 확보하고, JP 기록이 생긴 후에는 복합 PK를 예전 키로 되돌리지 않는다. 새로운 코드 역시 마이그레이션이 적용된 DB를 필요로 한다.

기존 테스트를 실행할 DB도 먼저 마이그레이션해야 한다. `internationalization-api.test.ts`는 자체 격리 스키마를 만들므로 운영 데이터나 실제 계정 선호를 변경하지 않는다.

## 일본 출시 전에 남은 작업

1. 출처가 확인된 일본 상품·판매 제안·1회분·영양 기준량·재료 근거 등록.
2. 일본 추천·장바구니·섭취 API를 `market_*` 테이블에 연결. 상품 이름의 한국어 정규식 대신 구조화된 끼니/재료 정보를 사용.
3. 전체 UI 번역과 국가 선택 화면, 금액·날짜 포맷 함수 연결.
4. 공유 링크의 국가 간 가져오기는 현지 상품을 다시 추천하거나 거절. 한국 상품 ID와 원화 예산을 그대로 일본 식단으로 복사하지 않기.
5. 현지 상품/표시 검증과 운영 준비가 끝난 뒤 `markets.status` 변경. 상태만 바꿔서는 출시가 완료되지 않는다.
