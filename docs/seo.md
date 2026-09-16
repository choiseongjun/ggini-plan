# 검색 노출 설정

배포 환경변수:

```dotenv
SITE_URL=https://gginiplan.kr
SEO_INDEXING_ENABLED=true
GOOGLE_SITE_VERIFICATION=소유권_확인_태그의_content_값
NAVER_SITE_VERIFICATION=소유권_확인_태그의_content_값
```

인증 값은 실제 발급된 값만 입력합니다. 공개 HTTPS 배포가 완료된 운영 환경에서만 검색 노출을 켜고 재빌드합니다. 로컬·스테이징은 SEO_INDEXING_ENABLED를 설정하지 않습니다. Vercel preview는 자동 제외됩니다. www 등 다른 도메인은 호스팅 설정에서 대표 주소로 영구 리디렉션합니다.

## 적용 내용
- 고유 제목·설명·canonical 및 Open Graph/Twitter 메타데이터
- 로그인 없이 서버 HTML로 제공되는 /guides 및 가이드 3개
- 홈에서 가이드로 이동하는 실제 링크, 관련 글 링크
- /robots.txt 및 /sitemap.xml (노출 활성화 시 공개 페이지 5개)
- 상세 가이드 탐색 경로 BreadcrumbList 구조화 데이터
- 관리자 noindex, API 수집 제외 (접근 권한 제어는 기존 인증 유지)

## 공개 배포 후
1. Google Search Console과 네이버 서치어드바이저에서 소유권을 확인합니다.
2. 양쪽에 https://gginiplan.kr/sitemap.xml 을 제출합니다.
3. 홈·가이드 주소의 수집과 색인 상태를 확인합니다.
4. 실제 검색어·노출·클릭 데이터를 보고 콘텐츠를 보완합니다.

localhost는 검색엔진이 접근할 수 없으며 SEO 작업만으로 색인·상위 노출을 보장하지 않습니다.

공식 참고: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
네이버: https://searchadvisor.naver.com/start
