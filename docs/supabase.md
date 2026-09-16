# Supabase 연결

애플리케이션은 .env.local의 DATABASE_URL로 Supabase Session Pooler(5432)에 연결합니다. 연결 URL은 비밀정보로 저장소에 포함하지 않습니다.

## 격리

이 프로젝트는 같은 DB의 기존 public 테이블과 분리된 kkiniplan 스키마를 사용합니다. 연결 URL의 options=-c search_path=kkiniplan 설정을 유지해야 합니다. public.users 등 기존 서비스 테이블에는 마이그레이션을 실행하지 마세요.

kkiniplan 스키마의 PUBLIC 접근 권한은 해제했습니다. 이 앱은 서버의 pg 연결과 자체 세션 인증을 사용하며 Supabase 클라이언트 REST API를 사용하지 않습니다.

## SSL

sslmode=verify-full과 sslrootcert=certs/supabase-ca.crt로 CA와 서버 호스트명을 검증합니다. 인증서 검증을 끄지 않습니다. 공개 CA 인증서는 Supabase 공식 Studio 설정에서 사용하는 아래 URL에서 내려받았습니다.

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

배포할 때 인증서 파일을 실행 디렉터리의 certs 아래에도 포함해야 합니다.

## 데이터 및 복구

상품 7개를 기존 카탈로그에서 복사했습니다. 로컬 사용자 계정·세션·신체정보·개인 기록은 클라우드로 복사하지 않았습니다. Google 로그인을 다시 하면 새 DB에 계정이 생성됩니다.

기존 로컬 DB는 그대로 유지했고 원래 연결값은 .env.local의 DATABASE_URL_LOCAL에 보관했습니다. 복구할 경우 해당 값을 DATABASE_URL로 설정하면 됩니다. 로컬 설정은 .env.local 하나만 사용합니다.

npm run db:migrate는 현재 DATABASE_URL이 지정한 DB와 스키마에 적용됩니다. 새 Supabase 프로젝트에서 처음 시작할 때는 전용 스키마를 먼저 생성한 후 연결 URL의 search_path를 설정하세요.
