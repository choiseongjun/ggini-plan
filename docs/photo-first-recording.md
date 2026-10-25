# 사진 중심 기록 (2026-10-24)

## 현재 사용 흐름

- 오늘: 영양 요약 → 사진/검색 기록 → 물 기록·다음 식사 준비.
- 하단: 오늘 / 식사 일기 / 통계 / 마이.
- 사진 촬영·앨범 선택 후 음식과 먹은 양을 확인하고 여러 음식을 한 끼로 저장한다.
- 영양정보가 없으면 미확인으로 표시한다. 사진만으로 분량을 확정하지 않는다.

## 분석과 저장

`DevicePhotoEntry → /api/food-photo/recognize → Groq → PhotoMealReview → /api/food-intake/confirmed-photo`

분석에는 로그인과 사진 전송 동의, 인터넷 연결이 필요하다. AI 없이 음식 이름을 직접 입력할 수도 있다. 선택한 사진과 수정 내용은 IndexedDB의 임시 기록에 보관하며, 최종 저장 시 사진과 음식 기록을 서버에 함께 저장한다. 무료 베타에는 계정별·서비스 전체 분석 한도가 있다.

## 폐기한 로컬 모델

Food101 Web Worker, 설치 화면, Transformers.js 의존성은 제거했다. 앱은 운영 웹을 여는 WebView이므로 이 변경에는 네이티브 앱 재빌드가 필요하지 않다.

RetiredModelCleanup은 방문 시 transformers-cache에서 huggingface.co의 기존 Food101 모델 경로만 지운다. 다른 캐시·IndexedDB 사진 초안·로그인 정보는 지우지 않는다. 캐시 접근이 차단되면 조용히 중단하고 다음 방문에 재시도한다.
