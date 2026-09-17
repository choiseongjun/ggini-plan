# 한국 상품 추천의 식사 목표

- 홈·장바구니 추천 조건과 마이페이지 장보기 설정에서 `체중 유지 · 골고루`, `체중 감량`, `근육 증가 · 운동` 선택.
- 목표는 `PlanConditions.goal`에 저장한다. 기존 `shopping_preferences.conditions`와 `shopping_plans.conditions` JSON을 사용하므로 DB 마이그레이션은 필요 없다.
- 마이페이지에서 기본 설정을 저장하고 홈에서 이번 추천에 한해 변경한다. 기존 초안에 목표가 없으면 저장된 기본 목표를 가져오며, 둘 다 없으면 유지로 표시한다.
- 목표 변경 시 기존 추천을 비우고 새 조건으로 생성한다. 메뉴 교체에도 동일한 기준을 적용한다.
- 유지: 기존 추천 점수. 감량: 표시된 1회분의 단백질/열량 비율을 보조 점수로 사용. 운동: 표시된 1회분 단백질량을 보조 점수로 사용.
- 목표 가산점은 100점 상한인 제품 비교 휴리스틱이다. 의학적으로 검증한 점수나 권장 섭취량을 의미하지 않는다. 기존 필요 열량 점수·가격·다양성도 유지한다.
- 출처, 기준량, 1회분이 확인되어 실제 섭취 기록에서도 환산 가능한 영양값만 사용한다. 영양값 누락이나 0 kcal에는 가산점이 없다.
- 예산·제외 재료·아침 적합성은 그대로 제한한다. 별도 간식·보조식품을 새로 한 끼 후보로 승격하지 않는다.
- 유지 필요량 숫자를 감량·증량 목표로 바꾸지 않으며 식사 횟수·분량을 자동으로 줄이지 않는다. 임신·수유 자동 추천 제한을 그대로 유지한다.
- 대만 화면에는 이번 목표 선택 UI를 노출하지 않는다.

일반 원칙 참고: [NIDDK 체중 관리와 식사](https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity), [NIH ODS 운동과 단백질](https://ods.od.nih.gov/pdf/factsheets/ExercisePerformance-Consumer.pdf). 이 출처는 앱의 점수 가중치를 검증하는 근거는 아니다.

검증: `node --import tsx --test tests/shopping-goals.test.ts tests/shopping-plan.test.ts tests/shopping-personalization.test.ts`
