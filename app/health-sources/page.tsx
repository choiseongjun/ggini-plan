import type { Metadata } from 'next';
import Link from 'next/link';
import { healthSources } from '../../lib/health-sources';
import '../legal.css';

export const metadata: Metadata = { title: '건강·영양 정보 출처와 추천 기준 | 끼니플랜' };

function Source({ id }: { id: keyof typeof healthSources }) {
  const source = healthSources[id];
  return <p>출처: <a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></p>;
}

export default function HealthSourcesPage() {
  return <main className="legal-page">
    <header><Link href="/" className="legal-brand">끼니플랜</Link><Link href="/">식단 추천으로 돌아가기</Link></header>
    <article>
      <p className="legal-kicker">추천 기준과 근거 자료</p>
      <h1>건강·영양 정보 출처</h1>
      <p className="legal-date">내용 확인일: 2026년 10월 2일</p>
      <p>끼니플랜은 일반 성인의 식사 선택을 돕는 서비스이며, 질환의 진단·치료·예방이나 개인별 의료 영양 처방을 제공하지 않습니다. 질환·복용약이 있거나 체중·식단을 치료 목적으로 조절하려면 의사 또는 영양사와 상의해 주세요. 임신·수유 중에는 자동 열량 계산을 제공하지 않습니다.</p>
      <p>아래 자료는 계산식과 일반 영양 원칙의 출처입니다. 해당 기관이 끼니플랜이나 개별 추천 메뉴의 효과·안전성을 검증했다는 의미는 아닙니다.</p>

      <h2 id="energy">1. 하루 열량 추정</h2>
      <p>Mifflin 등(1990), “A new predictive equation for resting energy expenditure in healthy individuals”, American Journal of Clinical Nutrition, 51(2), 241–247의 안정 시 에너지 소비량 추정식을 사용합니다. 체중(kg) × 10 + 키(cm) × 6.25 − 나이 × 5에 계산식 성별에 따라 남성은 5를 더하고 여성은 161을 뺍니다.</p>
      <Source id="energy" />
      <p>화면의 ‘기초대사량’은 이 식으로 추정한 값입니다. 여기에 활동량별 배수 1.2·1.375·1.55·1.725를 적용하고 끼니 수로 나누는 것은 앱의 간이 계산 방식입니다. 원 논문이 이 활동량 배수나 각 사용자의 섭취량을 검증한 것은 아닙니다. 실제 필요량은 생활 패턴·건강 상태에 따라 달라집니다.</p>

      <h2 id="nutrition">2. 영양 합계의 하루 참고량</h2>
      <p>보건복지부 「2025 한국인 영양소 섭취기준 활용」의 요약표(xi–xiii, xix쪽)를 참고합니다. 연령·성별 단백질 권장섭취량, 탄수화물 에너지 비율 50–65%, 지방 15–30%, 연령별 나트륨 충분섭취량과 만성질환위험감소섭취량을 표시합니다. 탄수화물·지방의 g 환산에는 앱에서 추정한 하루 열량을 사용합니다.</p>
      <Source id="nutrition" />
      <p>충분섭취량은 반드시 채워야 할 목표나 상한이 아닙니다. 만성질환위험감소섭취량은 그 이상 섭취할 때 줄이면 이득이 기대되는 수준이며 독성 상한을 뜻하지 않습니다. 참고량과 사용자가 직접 설정한 목표, 아래 메뉴 정렬 기준은 서로 다릅니다.</p>

      <h2 id="sodium">3. 나트륨과 ‘혈압 관리’ 선택</h2>
      <p>WHO는 성인에게 하루 나트륨 2,000mg 미만을 권고합니다. 미국 국립보건원(NIH)의 DASH 안내는 하루 1,500mg 수준이 2,300mg보다 혈압을 더 낮출 수 있다고 설명합니다.</p>
      <Source id="sodium" /><Source id="pressure" />
      <p>앱은 일반 추천에서 2,000mg, ‘혈압 관리’ 선택 시 1,500mg을 메뉴 정렬용 하루 참고값으로 사용합니다. 남은 끼니와 기록된 섭취량에 따라 나트륨이 많은 메뉴의 순위를 낮추지만, 해당 수치 이하의 식단이나 DASH 식단 전체를 보장하지 않습니다. 개인의 치료 목표는 의료진과 정해야 합니다.</p>

      <h2 id="glucose">4. ‘혈당 관리’ 선택</h2>
      <p>미국 질병통제예방센터(CDC)는 탄수화물 중 당과 전분이 혈당에 영향을 주며, 적절한 탄수화물 양은 개인별로 정해야 한다고 안내합니다.</p>
      <Source id="glucose" />
      <p>앱은 한 끼 탄수화물이 70g을 넘는 메뉴의 추천 점수를 낮춥니다. 70g은 앱 내부의 정렬 기준이며 CDC가 정한 의료 기준이나 모든 사용자에게 적절한 섭취량이 아닙니다. 당류·식이섬유·약물·개인의 혈당 반응을 종합한 계산이 아니므로 혈당 조절 효과를 예측하거나 보장할 수 없습니다.</p>

      <h2 id="goals">5. 체중·근육 목표와 탄단지 비율</h2>
      <p>운동하는 성인의 단백질 섭취 참고 자료로 ISSN의 2017 입장문을 제공합니다. 이 문헌의 체중 kg당 하루 1.4–2.0g 범위는 대부분의 운동하는 사람을 대상으로 하며 모든 사용자에게 적용되는 처방이 아닙니다.</p>
      <Source id="protein" />
      <p>앱의 감량·유지·근육 목표는 자체 설정입니다. 감량은 유지 열량의 15%와 500kcal 중 작은 값을 빼고, 근육 목표는 10%와 300kcal 중 작은 값을 더합니다. 감량 계산에서는 추정 안정 시 에너지 소비량보다 낮게 계산하지 않지만, 이것이 안전성을 보장하는 하한은 아닙니다.</p>
      <p>단백질은 체중 kg당 감량 1.6g·유지 1.2g·근육 1.8g으로 시작해 열량 비율 15–35%로 제한합니다. 지방 비율은 감량 30%·유지 및 근육 25%, 나머지는 탄수화물로 정합니다. 이 수치 조합은 앱의 초기 목표이며 위 문헌이나 한국인 영양소 섭취기준이 이 조합을 처방한 것은 아닙니다. 직접 입력한 목표는 사용자 설정값입니다.</p>

      <h2 id="bmi">6. BMI 표시</h2>
      <p>BMI는 체중(kg)을 키(m)의 제곱으로 나눈 값입니다. 대한비만학회의 2022 진료지침을 설명한 “Diagnosis of Obesity: 2022 Update of Clinical Practice Guidelines for Obesity by the Korean Society for the Study of Obesity”(2023)를 참고해 성인에서 18.5 미만 저체중, 18.5–22.9 정상, 23–24.9 비만 전단계, 25 이상 비만으로 표시합니다. BMI만으로 개인의 건강 상태를 진단할 수 없습니다.</p>
      <Source id="bmi" />

      <h2 id="data">7. 개별 메뉴의 영양정보와 추천 한계</h2>
      <p>메뉴 영양값에는 등록된 재료·상품 정보의 합산값과 AI 추정값이 포함됩니다. 화면의 ‘재료 합산 예상’·‘AI 추정 포함’ 표시를 확인해 주세요. 실제 섭취량은 재료·조리법·양에 따라 다르며, 이 페이지의 문헌이 개별 메뉴의 영양값을 검증한 것은 아닙니다.</p>
      <p>예산·취향·조리 부담·열량·영양값을 함께 고려하는 추천 점수와 가중치는 앱 내부 규칙입니다. 특정 질환에 적합한 메뉴라는 인증이 아니며 알레르기 유발 성분은 제품 표시와 실제 재료를 직접 확인해야 합니다.</p>
      <footer><Link href="/">식단 추천으로 돌아가기</Link></footer>
    </article>
  </main>;
}
