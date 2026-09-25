# 음식사진 자동 선별

`npm run recipes:import-images`는 검색 후보를 로컬 CLIP 모델로 분류한 뒤 완성된 음식사진 후보만 저장한다. 유료 AI API나 Codex 실행은 필요하지 않다. 최초 실행에는 모델 다운로드가 필요하며 이후에는 로컬 모델과 URL별 점수 캐시를 재사용한다.

기존 데이터 정리: `npm run recipes:review-images`

미리보기: `node --env-file=.env.local --import tsx scripts/review-recipe-images.mjs --limit=20`

변경 전 후보 및 변경 결과는 `.cache/food-photo-review/changes.jsonl`에 남는다. 작업을 중단한 뒤 같은 명령을 실행하면 이미 판별한 URL은 캐시를 사용한다. 직접 검토한 메뉴는 수동 선택을 우선한다. 동시에 원본 사진이 변경된 행은 덮어쓰지 않는다.

모델은 음식사진과 인물·풍경·재료·광고 등을 비교한다. 음식사진 점수가 0.65 이상이며 다른 분류의 최대 점수보다 3배 이상인 후보만 채택한다. 점수는 확률이 아니며, 음식 이름까지 정확히 일치하는 것을 보장하지 않는다. 통과 후보가 없으면 기존 사진을 비우고 새 수집은 저장을 보류한다. 이후 import-images 실행 시 대체 후보를 수집한다. 원본 후보는 changes.jsonl에 보관한다.

모델: https://huggingface.co/Xenova/clip-vit-base-patch32
