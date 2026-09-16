# 끼니플랜

식비·식단·장바구니를 한 화면에서 보는 앱입니다. 로그인 없이 홈과 달력, 장바구니, 기록을 둘러볼 수 있습니다. 계정과 로그인 세션은 로컬 PostgreSQL에 저장합니다.

## 로컬 실행

Docker Desktop을 켠 뒤 처음 한 번 DB를 준비합니다. `db:setup`은 무작위 로컬 DB 비밀번호를 생성해 Git에서 제외된 `.env`와 `.env.local`에 저장하고, PostgreSQL 컨테이너 및 테이블을 만듭니다.

```bash
npm install
npm run db:setup
npm run dev
```

`http://localhost:3000`에서 바로 홈을 볼 수 있으며, 상단의 로그인에서 회원가입하거나 로그인할 수 있습니다. 비밀번호는 해시로 저장하고 로그인은 HttpOnly 세션 쿠키를 사용합니다. 개발 서버가 이미 실행 중이었다면 DB 설정 후 다시 시작하세요.

```bash
npm run db:migrate # 스키마 다시 적용
npm run db:down    # 컨테이너 중지, 데이터 볼륨 유지
npm run test:auth  # 개발 서버가 실행 중일 때 인증 흐름 검사
```

DB는 `127.0.0.1:5432`에만 연결됩니다. 마이페이지의 키·체중·나이·계산식 성별·활동량·끼니 수는 로그인한 계정의 `body_profiles`에 저장합니다. 식단·예산·지출 기록의 계정별 저장은 아직 연결되지 않았습니다.

마이페이지는 Mifflin–St Jeor 식의 휴식 에너지 추정값과 활동계수 기반 유지 칼로리, 한 끼 평균을 표시합니다. 계산은 만 19~78세를 대상으로 하며 임신·수유 중에는 추정치를 제공하지 않습니다. 기초대사량을 최소 섭취량으로 표시하지 않으며, 실제 식단의 목표 열량을 자동 변경하지 않습니다. 계산 및 계정별 저장 검증: `node --env-file=.env.local --import tsx --test tests/body-profile.test.ts`.

## 상품·영양 정보 관리자

`.env.local`에 관리자 계정 이메일을 설정한 뒤 서버를 재시작하고 `npm run db:migrate`를 실행합니다. 여러 관리자 이메일은 쉼표로 구분합니다. 해당 이메일로 로그인한 후 `/admin`에서 8개 식재료의 실제 상품 링크, 가격, 구성, 검색어와 영양 성분을 수정할 수 있습니다.

```dotenv
ADMIN_EMAILS=you@example.com
```

영양 성분은 기준량·출처 이름과 HTTPS 원문 링크 또는 영양표 사진을 함께 입력해야 저장됩니다. 저장된 상품 정보는 장바구니와 가격 비교에 반영되고, 출처가 확인된 영양 수치만 장바구니에 표시됩니다. 초기 가격은 계획용 예시값입니다. 발아현미밥에는 확인한 [CJ 공식 상품 페이지](https://www.cjthemarket.com/the/product/product-main?prdCd=40119245)를, 바나나에는 [K-FIND 원재료성 식품 자료](https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?searchFoodCd=R108-037000001-0000&searchMonthCd=AVG&searchRegionCd=ZZ)의 가식부 100g당 영양값을 연결했습니다. 나머지 상품 링크와 영양 수치는 정확한 제품을 선택하고 검증하기 전까지 비워 둡니다. 일반 식품 자료는 [식약처 K-FIND 식품영양성분 DB](https://various.foodsafetykorea.go.kr/nutrient/general/food/firstList.do)에서 조회할 수 있지만, 가공식품은 판매 상품의 포장지나 제조사 자료와 일치하는지 확인해야 합니다.

관리자에서 상품을 선택하고 영양표 사진(JPG·PNG·WEBP, 8MB 이하)을 첨부하면 서버가 한국어·영어 OCR로 기준량, 열량, 단백질, 탄수화물, 지방, 나트륨을 읽어 입력칸에 채웁니다. 사진에서 읽은 값은 초안이므로 원본과 대조해 수정한 뒤 **변경사항 저장**을 눌러야 공개됩니다. 저장할 때 사진도 DB에 보관되어 영양 정보의 원문 출처로 열 수 있습니다. 사진만 있는 경우 외부 영양 정보 링크는 비워 두어도 됩니다. 상품 링크는 사진에서 추출할 수 없으므로 별도로 입력합니다.

## Firebase 구글 로그인 설정

로그인·회원가입 화면의 **Google로 계속하기** 버튼은 Firebase Authentication의 구글 팝업 로그인을 사용합니다. 브라우저가 Firebase ID 토큰을 `/api/auth/firebase`로 보내면 서버가 검증하고 PostgreSQL 계정과 HttpOnly 세션을 생성합니다.

1. [Firebase 콘솔](https://console.firebase.google.com/) → 프로젝트 설정 → 일반 → 웹 앱에서 Firebase 구성을 가져옵니다.
2. Authentication → 로그인 방법에서 Google을 활성화하고, 설정 → 승인된 도메인에 `localhost`를 등록합니다.
3. Git에서 제외된 `.env.local`에 아래 값을 설정합니다. 서버의 프로젝트 ID와 웹 앱의 프로젝트 ID는 같아야 합니다.

```dotenv
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=웹_앱_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ggini-plan.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ggini-plan
NEXT_PUBLIC_FIREBASE_APP_ID=웹_앱_APP_ID
FIREBASE_PROJECT_ID=ggini-plan
```

4. 개발 서버를 재시작하고 `http://localhost:3000`에서 로그인 → Google로 계속하기를 선택합니다. `127.0.0.1` 주소와 혼용하지 마세요.

배포 시 `AUTH_URL`을 실제 HTTPS 서비스 주소로 변경하고 Firebase의 승인된 도메인에 배포 도메인을 추가합니다. 공개 환경변수는 빌드할 때 반영됩니다. 운영 환경에서는 `AUTH_URL`이 필수입니다.

서버는 `firebase-admin`으로 서명·발급자·대상 프로젝트·만료를 검증하고 Google 제공자, 확인된 이메일, 5분 이내의 인증 시각을 확인합니다. 검증된 토큰의 구글 고유 ID를 기존 `oauth_accounts`와 연결하므로 이메일로 계정을 임의 통합하지 않습니다. Firebase 토큰은 브라우저 메모리에서만 사용하고 DB 세션 발급 후 Firebase 클라이언트에서 로그아웃합니다. Analytics는 초기화하지 않습니다.

현재 사용하는 공개키 기반 ID 토큰 검증에는 명시적인 프로젝트 ID만 설정하며 서비스 계정 JSON은 사용하지 않습니다. Firebase 사용자 관리나 토큰 폐기 여부 조회는 별도 관리자 자격 증명이 필요합니다. Firebase에서 계정을 비활성화해도 이미 발급한 앱의 DB 세션이 자동으로 폐기되지는 않습니다.

```bash
npm run test:firebase # 토큰 거부·Google claims·DB 세션 테스트; 성공 토큰 응답은 테스트에서 대체
npm run test:auth     # 기존 이메일 로그인 회귀 검사
```

팝업을 지원하는 일반 Chrome·Edge 브라우저에서 실제 구글 계정으로 로그인 완료 여부를 확인하세요. 앱 내장 브라우저의 팝업·외부 스크립트 제한은 네트워크 오류로 나타날 수 있습니다. 구현 참고: [Firebase 구글 로그인](https://firebase.google.com/docs/auth/web/google-signin), [서버 토큰 검증](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

기존 직접 OAuth 서버 경로(`/api/auth/google`, `/api/auth/google/callback`)는 유지하지만 현재 로그인 버튼에서는 사용하지 않습니다. 해당 경로만 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 설정을 사용합니다.

## 식재료 온라인 비교

장바구니에서 식재료를 누르면 판매 상품의 가격과 100g당 또는 1개당 가격을 비교합니다.

- `SERPAPI_KEY`가 없으면 앱 안에 판매가를 표시하지 않습니다. 네이버쇼핑·쿠팡·컬리·SSG.COM 버튼은 각 사이트의 실제 검색 화면을 엽니다.
- 실시간 결과를 앱 안에 표시하려면 [SerpApi Google Shopping API](https://serpapi.com/google-shopping-api) 키를 `.env.local`에 넣고 개발 서버를 재시작합니다.

```dotenv
SERPAPI_KEY=발급받은_키
```

키는 서버의 `/api/compare`에서만 사용하며 브라우저에 전달하지 않습니다. 검색 결과의 판매가와 용량은 각 판매처의 상품 옵션 및 배송비를 포함하지 않을 수 있으므로 구매 전에 상세 페이지를 확인해야 합니다. 용량을 확실히 읽지 못한 결과에는 단위가격을 표시하지 않습니다.

네이버 개발자센터의 [쇼핑 검색 API는 2026년 7월 31일 종료](https://developers.naver.com/notice/article/32564)됐으므로 이 앱의 실시간 데이터 제공자로 사용하지 않습니다. 네이버쇼핑 웹 검색 링크는 계속 제공합니다.
