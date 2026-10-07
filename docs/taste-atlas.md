# 입맛 도감

기존 투표 만들기 진입점을 `/taste`로 교체했다. `/battle`은 새 화면으로 이동한다. 기존 `/battle/:id` 링크와 사용자 투표 데이터는 유지한다.

음식 6장에 당긴다/패스로 답하면 실제 선택으로 취향 카드와 메뉴 후보를 구성한다. 모두 패스하면 메뉴를 억지 추천하지 않는다. 전문 성향 분석이나 알레르기 검사를 뜻하지 않는다.

`?me=0..63`은 내 결과 복원, `?friend=0..63`은 친구의 선택 공유다. 공유에는 이름·계정·기록 없이 6개 음식 선택만 들어간다. 공통 선택이 있으면 공통 메뉴를 추천한다. 없으면 없다고 표시한다. 선택 버전 v1을 고정해 기존 링크의 의미가 바뀌지 않게 한다.

오늘 저녁으로 담기는 기존 `/api/manual-meal-plans`의 인증 및 날짜 검증을 사용한다. 비회원은 선택·결과·공유를 모두 이용할 수 있고 식단 저장에서만 로그인이 필요하다. 음식 선택 화면과 320/390px 결과 화면, 공유 결과 교집합을 브라우저에서 확인했다. `tests/taste-atlas.test.ts`는 전체 64가지 선택과 잘못된 링크 값을 검증한다.

## 이미지 제작 기록

내장 image_gen 도구 사용. 최종 원본: `public/taste/food-sheet.png`. 3열 2행 시트를 CSS 위치로 표시하며 Next 이미지 최적화 URL을 사용한다. 화면에 AI 예시 이미지 안내를 표시한다.

최종 프롬프트:

Create one production-ready photographic food sprite sheet for a Korean meal preference app. Exactly 3 columns and 2 rows of equal square tiles, overall 3:2 landscape. Tiles touch edge to edge with no borders or gutters, each independently composed with its food fully inside its own tile, same overhead editorial warm daylight, elegant cream linen surface, exceptionally appetizing realistic food photography. Reading order MUST be: top left Japanese-style Korean pork cutlet 돈가스 sliced crispy golden breaded pork with sauce and shredded cabbage; top middle Korean kimchi jjigae 김치찌개 red stew with tofu pork kimchi in black earthenware bowl; top right tteokbokki 떡볶이 glossy red cylindrical rice cakes and fish cakes; bottom left bibimbap 비빔밥 rice bowl with colorful vegetables and sunny side up egg; bottom middle cream pasta 크림파스타 creamy white spaghetti with mushrooms; bottom right jeyuk bokkeum 제육볶음 spicy red stir-fried thin pork slices with onion and scallion beside rice. Each tile a beautifully styled close-up editorial photograph viewed from directly above. Main dish centered with generous 15 percent empty margin on each tile; no food crosses tile boundaries. No letters, no logos, no labels, no watermarks, no split items. This single sheet will be displayed using CSS background-position; precise equal 3x2 grid is essential.

## 친구 퀴즈 v2

새 `/taste`는 여섯 상황에서 두 사진 중 하나를 고르는 퀴즈다. 순서와 양쪽 메뉴는 `lib/taste-quiz.ts`에 고정한다. 공유는 `/taste?v=2&q=0..63`, 작성자 복원은 `v=2&me=`, 친구 채점 복원은 `v=2&q=&guess=`다. 친구의 실제 취향은 별도의 `me`이며 추측 답변과 섞지 않는다. v1 링크는 `legacy-screen.tsx`에서 기존 의미로 열린다. 정답은 클라이언트 링크에 담기므로 경쟁·보상용 부정행위 방지 기능이 아니다.

흐름: 내 취향 6번 → 도전장 공유 → 친구 추측 6번 → 실제/예상 채점표 → 친구 본인 취향 6번 → 공통 음식 룰렛 및 새 도전장 공유. 공통 음식은 중복 없이 처음에는 동일 확률로 돌리고, 재추첨에서는 직전 당첨 메뉴를 제외한 후보를 동일 확률로 뽑는다. 0개면 빈 상태, 1개면 단일 메뉴를 표시한다. 작성자에게 친구 결과가 자동으로 전달되지는 않는다. 친구는 채점표 PNG를 공유할 수 있다. 작성자용 이미지에는 정답을 숨긴다. PNG는 1080×1350이고, 링크 미리보기는 전용 Open Graph 이미지다.

분석 이벤트는 기존 PostHog 경로와 최종 전송 허용 목록을 따른다. 진입/초대 진입/퀴즈 작성/추측 완료/친구 작성/공유 클릭/공유 API 완료/링크 복사/이미지 출력/룰렛/식단 저장을 각각 구분한다. 답안·음식명·공유 URL·개인 정보는 전송하지 않는다. 공유 API 완료나 복사는 실제 수신 또는 SNS 게시 완료를 보장하지 않는다. 공유별 초대자 식별은 하지 않으므로 초기 지표는 단계별 집계이며 개인별 초대 전환 추적은 아니다. 환경 설정이 없는 로컬에서는 분석이 전송되지 않는다.

검증: `tests/taste-quiz.test.ts`에서 64개 링크와 4096개 조합의 채점·교집합, 분석 필터링을 검사한다.
