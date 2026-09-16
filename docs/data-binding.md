# 전면 데이터 바인딩

## 데이터 흐름

- 상품: 관리자와 앱 모두 catalog_items 전체를 조회합니다. 코드의 기본 상품 배열이나 DB 실패 시 가상 상품 대체는 없습니다. 관리자의 카테고리·장바구니 포함 설정을 반영합니다.
- 홈: 한국 날짜와 이번 주 예산·지출, 오늘 마지막 생성 식단, DB 상품을 표시합니다.
- 달력: 계정의 일별 최신 meal_plans와 daily_expenses를 표시합니다. 식단 생성일에 등록하며 미래 식단을 임의로 복제하지 않습니다.
- 기록: 식비·교통·생활용품·기타 항목의 날짜별 합계를 저장하며, 최근 4주 그래프를 실제 저장값으로 집계합니다. 0원을 저장하면 해당 날짜·항목 금액을 수정할 수 있습니다.
- 맞춤 식단: 생성 시 DB 카탈로그에서 연결 가능한 재료의 구매 후보와 링크를 넣습니다. 출처와 g 기준량이 확인되는 영양값을 반영하며, 미확인 값은 기존 참고값을 사용한 예상치로 명시합니다. 과거 식단은 생성 시점 스냅샷을 보존합니다.
- 커뮤니티: DB 상품으로 공유·따라 담기를 처리하며 실제 사용자 글과 반응만 표시합니다.
- 온라인 비교: 검색 API가 설정되지 않았으면 등록 판매처의 확인 가격을 보여줍니다. 이를 실시간 최저가로 표시하지 않습니다.

## API 및 테이블

GET /api/dashboard: 날짜, 이번 주 예산, 사용자 지출(최근 2000개 항목), 날짜별 최신 식단(최대 366일).
PUT /api/dashboard: {action:"budget",amount} 또는 {action:"expense",date:"YYYY-MM-DD",category:"food|transport|household|other",amount}.

weekly_budgets, daily_expenses 테이블 추가. 쓰기는 세션 인증과 출처 검증을 적용하며 클라이언트가 사용자 ID를 지정할 수 없습니다.

## 실제 판매 상품

2026-09-16 판매 페이지 확인. 가격은 수집 시점 스냅샷이며 옵션·할인·배송비에 따라 변동됩니다.

- 햇반 발아현미밥: https://www.cjthemarket.com/the/product/product-main?prdCd=40119245
- KF365 바나나: https://www.kurly.com/goods/1001872242
- Kurly’s 두부: https://www.kurly.com/goods/5053329
- KF365 달걀: https://www.kurly.com/goods/1000179412
- 모두의식단 닭가슴살: https://www.kurly.com/goods/1001384157
- 묵은지 김치찌개 밀키트: https://www.kurly.com/goods/1000136401
- 햇반 새우 볶음밥: https://www.cjthemarket.com/the/product/product-main?prdCd=40164886

npm run db:migrate 후 npm run db:catalog. seed는 관리자 수정(updated_by)이 있는 상품을 덮어쓰지 않습니다. 샘플 사용자 지출이나 체중은 생성하지 않습니다.

npm run test:dashboard 및 npm run test:meals로 계정 분리·저장·입력 검증·추천 연동을 확인합니다.
