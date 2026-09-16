# 상품 이미지 Storage

서버 환경변수: SUPABASE_URL, SUPABASE_SECRET_KEY (또는 SUPABASE_SERVICE_ROLE_KEY), SUPABASE_STORAGE_BUCKET=ggini-plan.
키에는 NEXT_PUBLIC 접두사를 사용하지 않습니다.

- 공개 상품 이미지 버킷, 업로드는 관리자 API에서만 실행합니다.
- 대표 이미지 URL 입력 → 허용된 CDN에서 다운로드 → 파일 서명·8MB 제한 검사 → Storage 저장 → 다운로드 해시 검증 → DB 주소 저장.
- 영양표 첨부 파일도 Storage에 저장하고 nutrition_photo_url에 주소만 기록합니다.
- 판매 상품 링크와 영양 정보 원문 링크는 출처이므로 그대로 유지합니다.
- 기존 DB 바이트 사진은 이전될 때까지 조회할 수 있습니다.
- 기존 이미지 이전: node --env-file=.env.local --import tsx scripts/migrate-catalog-images.ts
- 내용 해시로 파일명을 생성하므로 재실행해도 중복 파일을 만들지 않습니다.
- 다운로드 가능한 CDN은 기본 컬리·CJ 이미지 호스트입니다. 추가 호스트는 서버 IMAGE_IMPORT_HOSTS에 신뢰할 수 있는 이미지 CDN의 정확한 호스트명만 쉼표로 구분해 등록합니다. 리디렉션도 같은 검사를 거칩니다.
- 상품 교체 후 과거 이미지나 DB 저장 실패로 남은 이미지는 자동 삭제하지 않습니다. 참조 여부를 확인하고 정리해야 합니다.

Storage 파일은 DB 백업에 포함되지 않으므로 별도 보관 정책이 필요합니다.
