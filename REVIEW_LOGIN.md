# 스토어 심사용 로그인

`/review-login`은 기존 `/api/auth/login`의 이메일·bcrypt 비밀번호 검증 및 HttpOnly 세션을 그대로 사용하는 화면입니다. 로그인 화면 하단에서 접근합니다. 인증 우회, 고정 비밀번호, 관리자 권한 또는 별도의 기능 숨김은 없습니다.

2026-09-25: 사용자가 운영 DB를 확인한 뒤 계정을 생성했고, https://gginiplan.kr/review-login 배포 및 일반 계정 로그인·식단 추천·식단 저장을 브라우저에서 확인했습니다. Play Console 로그인 세부정보도 저장했습니다. 실제 Android/iOS 촬영·업로드 테스트는 별도로 남아 있습니다.

재설정 또는 새 환경 배포 시 확인:

1. 대상 배포의 DATABASE_URL 및 ADMIN_EMAILS를 확인합니다. 운영 사용자의 계정을 재사용하지 않습니다.
2. `node --env-file=.env.local scripts/create-review-account.mjs --create`로 전용 일반 계정을 만듭니다. 대상 DB를 확인한 뒤에만 실행합니다.
3. 생성된 `.env.review.local`은 비밀 파일입니다. 저장소에 커밋하지 않고 Play Console의 로그인 세부정보에만 입력합니다. 출력·채팅에 붙여넣지 않습니다.
4. 코드를 웹에 배포하고 `/review-login`에서 로그인 → 메뉴 추천 → 촬영/업로드 → 기록 저장을 확인합니다. 계정은 실제 사용자 자료가 없는 테스트 전용 공간이며 관리자 권한을 주면 안 됩니다.
5. Play Console에 계정과 아래 영어 안내를 입력한 뒤 실제 검토 접근 가능 여부를 확인합니다.

영어 안내:

Open the app, tap Login, then “심사용 로그인 / App review”. Enter the provided review email and password. No Google account or two-factor authentication is required for this dedicated test account. After login, use the home meal recommendation flow. On a meal, tap “먹었어요 · 사진 올리기” to take or select a photo and follow the prompts to save the meal record. The review account uses the same features as regular accounts.

현재 코드 추가만으로 계정 생성 또는 배포가 완료되는 것은 아닙니다. 계정 생성 결과와 배포 URL을 검증하기 전에는 콘솔의 전체 접근 가능 확인란을 선택하지 마세요.
