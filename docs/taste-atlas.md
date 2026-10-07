# 입맛 도감

기존 투표 만들기 진입점을 `/taste`로 교체했다. `/battle`은 새 화면으로 이동한다. 기존 `/battle/:id` 링크와 사용자 투표 데이터는 유지한다.

음식 6장에 당긴다/패스로 답하면 실제 선택으로 취향 카드와 메뉴 후보를 구성한다. 모두 패스하면 메뉴를 억지 추천하지 않는다. 전문 성향 분석이나 알레르기 검사를 뜻하지 않는다.

`?me=0..63`은 내 결과 복원, `?friend=0..63`은 친구의 선택 공유다. 공유에는 이름·계정·기록 없이 6개 음식 선택만 들어간다. 공통 선택이 있으면 공통 메뉴를 추천한다. 없으면 없다고 표시한다. 선택 버전 v1을 고정해 기존 링크의 의미가 바뀌지 않게 한다.

오늘 저녁으로 담기는 기존 `/api/manual-meal-plans`의 인증 및 날짜 검증을 사용한다. 비회원은 선택·결과·공유를 모두 이용할 수 있고 식단 저장에서만 로그인이 필요하다. 음식 선택 화면과 320/390px 결과 화면, 공유 결과 교집합을 브라우저에서 확인했다. `tests/taste-atlas.test.ts`는 전체 64가지 선택과 잘못된 링크 값을 검증한다.

## 이미지 제작 기록

내장 image_gen 도구 사용. 최종 원본: `public/taste/food-sheet.png`. 3열 2행 시트를 CSS 위치로 표시하며 Next 이미지 최적화 URL을 사용한다. 화면에 AI 예시 이미지 안내를 표시한다.

최종 프롬프트:

Create one production-ready photographic food sprite sheet for a Korean meal preference app. Exactly 3 columns and 2 rows of equal square tiles, overall 3:2 landscape. Tiles touch edge to edge with no borders or gutters, each independently composed with its food fully inside its own tile, same overhead editorial warm daylight, elegant cream linen surface, exceptionally appetizing realistic food photography. Reading order MUST be: top left Japanese-style Korean pork cutlet 돈가스 sliced crispy golden breaded pork with sauce and shredded cabbage; top middle Korean kimchi jjigae 김치찌개 red stew with tofu pork kimchi in black earthenware bowl; top right tteokbokki 떡볶이 glossy red cylindrical rice cakes and fish cakes; bottom left bibimbap 비빔밥 rice bowl with colorful vegetables and sunny side up egg; bottom middle cream pasta 크림파스타 creamy white spaghetti with mushrooms; bottom right jeyuk bokkeum 제육볶음 spicy red stir-fried thin pork slices with onion and scallion beside rice. Each tile a beautifully styled close-up editorial photograph viewed from directly above. Main dish centered with generous 15 percent empty margin on each tile; no food crosses tile boundaries. No letters, no logos, no labels, no watermarks, no split items. This single sheet will be displayed using CSS background-position; precise equal 3x2 grid is essential.
