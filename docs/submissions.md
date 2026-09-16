# 메뉴·상품 제보

- /submissions: 공개 목록, 로그인 후 제보, 작성자 본인의 검토 내역·재제출
- /admin/submissions: 관리자 전용 검토 및 수정 후 승인·보완 요청·반려
- 홈·장바구니·마이에서 제보 페이지 연결, 상품 관리자에서 제보 관리 연결

## 초기 설정
1. `node scripts/migrate.mjs`로 submissions 테이블 적용
2. `node --env-file=.env.local --import tsx scripts/setup-submissions.ts`로 비공개 ggini-submissions 버킷 준비
3. 기존 SUPABASE_URL, SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY 사용

현재 연결된 Supabase에는 테이블과 비공개 버킷을 적용했습니다. 배포 시 동일한 서버 환경변수가 필요합니다.

## 검토와 노출
- 상태: pending → approved / needs_changes / rejected
- 보완·반려 시 사유 필수. 작성자가 수정하면 pending으로 재접수
- 승인 후 작성자 수정 불가. 승인 상품은 기존 상품 관리자에서 관리
- 승인 상품은 카탈로그에 등록되어 장바구니·가격 비교에서 조회 가능
- 승인 메뉴는 공개 제보 목록에 표시. 맞춤 영양 추천에는 자동 포함하지 않음
- 사용자 영양 메모는 작성자와 관리자만 조회. 영양 수치는 기존 상품 관리에서 원문 확인 후 별도로 등록
- 작성자 계정 정보·검토 답변은 공개 응답에 포함하지 않음
- 사진은 비공개 Storage에 저장. API에서 승인 여부 또는 소유자·관리자 권한 확인 후 전달
- 상품 승인 시 사진은 공개 상품 Storage로 복사
- optimistic version 검사와 행 잠금으로 오래된 검토 및 중복 승인 차단
- 신규 제출은 계정당 24시간 10건, 사진 8MB, JPG/PNG/WEBP
- 목록은 본인/공개 최근 100개, 관리자 최근 200개(검토 중 우선)

검증: `node --env-file=.env.local --import tsx --test tests/submissions.test.ts`
