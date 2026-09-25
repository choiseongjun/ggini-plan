# 메뉴 품질 검수

## Ollama 로컬 검수

32GB 메모리 PC의 기본 모델은 `qwen3.5:9b`다. 약 6.6GB 다운로드가 필요하며 실제 실행 속도는 CPU/GPU에 따라 달라진다.

```powershell
ollama pull qwen3.5:9b
# 먼저 대표 메뉴만 비교한다.
node --env-file=.env.local --import tsx scripts/review-menu-ollama.ts
# 전체 메뉴. 중단 후 같은 명령으로 완료한 배치부터 이어간다.
node --env-file=.env.local --import tsx scripts/review-menu-ollama.ts --all
```

`OLLAMA_MENU_MODEL`로 다른 로컬 모델을 선택할 수 있다. 요청은 localhost:11434로만 보내며 유료 API로 대체 호출하지 않는다. DB에서는 메뉴명·재료만 읽는다. 사진 검수나 이미지 생성은 이 명령의 대상이 아니다.

결과는 `artifacts/menu-review/ollama-review.json`, 배치 캐시는 `.cache/menu-review-ollama`에 저장한다. `complete`와 `scope`를 확인한다. 표본이나 중단된 결과가 운영 카탈로그를 덮어쓰지 않도록 적용 기능은 분리했다. 전체 결과도 사람의 검토와 기존 수동 보정 대조 후 운영 검수 파일에 반영해야 한다. Vercel 서버가 개인 PC의 Ollama를 호출하는 방식이 아니라 로컬 일괄 검수 도구다.

## 기존 API 검수

추천 카탈로그의 이름과 재료가 일치하는지 검수한다. 사진의 적합성이나 영양 수치의 정확성을 검증하는 작업은 아니다. AI 판단은 실제 존재 여부의 증명이 아니며, 불명확한 항목은 원본을 삭제하지 않고 보류한다.

실행:

```powershell
node --env-file=.env.local --import tsx scripts/review-menu-quality.ts
node --env-file=.env.local --import tsx scripts/review-menu-quality.ts --verify
node --import tsx scripts/finalize-menu-review.ts
```

첫 검수는 gpt-4.1-mini, 재검수는 gpt-4.1을 사용한다. OPENAI_MENU_REVIEW_MODEL로 변경할 수 있다. 요청은 35개씩 순차 처리하며 입력·프롬프트·모델별 결과를 .cache/menu-review에 저장한다. 중단 후 재실행하면 완료한 요청은 재사용한다. 새 실행도 API 비용이 발생하므로 전체를 반복 호출하지 않는다.

- data/menu-quality-review.json: 전체 검수 결과. keep/rename/hold와 원본 이름·재료를 보관한다.
- data/menu-quality-adjustments.json: 원본 이름·재료를 직접 대조한 수정. 재료가 달라지면 자동 적용하지 않는다.
- finalize 단계: 수동 수정 적용, 공백·구분자를 제외한 동일 이름의 중복을 대표 메뉴 하나로 제한. 같은 이름이어도 서로 다른 변형이 필요한 경우 수동 검토 후 구분되는 이름을 사용한다.
- artifacts/menu-review/results.csv: 전체 판정 내역. 서버 배포 대상이 아니다.

검수 파일은 배포해야 운영에 적용된다. 홈과 밑반찬 추천은 승인된 메뉴만 사용한다. 이름이나 재료·분량이 바뀐 메뉴, 신규 메뉴는 다시 검수하기 전까지 자동 보류한다. 관리자 메뉴 목록에서 `메뉴 검수 보류`와 `이름 정리됨` 필터로 확인한다. 기존 식사 기록은 저장된 이름·영양 스냅샷을 사용하므로 지우거나 바꾸지 않는다.

메뉴를 무조건 많이 생성하지 않도록 후보 생성 프롬프트를 최대 20개, 부족하면 적게 반환하는 방식으로 변경했다. 생성된 목록은 검수 승인과 별개다.
