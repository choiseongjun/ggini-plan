// References support the described principles, not clinical validation of our menu ranking.
export const healthSources = {
  energy: { label: 'Mifflin–St Jeor 열량 계산식', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
  nutrition: { label: '2025 한국인 영양소 섭취기준', url: 'https://health.seoulmc.or.kr/uploadFiles/2025_%ED%95%9C%EA%B5%AD%EC%9D%B8%EC%98%81%EC%96%91%EC%86%8C%EC%84%AD%EC%B7%A8%EA%B8%B0%EC%A4%80_%ED%99%9C%EC%9A%A9.pdf' },
  sodium: { label: 'WHO 나트륨 섭취 안내', url: 'https://www.who.int/news-room/fact-sheets/detail/sodium-reduction' },
  pressure: { label: '미국 NIH의 DASH 식사 안내', url: 'https://www.nhlbi.nih.gov/health/dash-eating-plan' },
  glucose: { label: '미국 CDC의 탄수화물·혈당 안내', url: 'https://www.cdc.gov/diabetes/healthy-eating/carb-counting-manage-blood-sugar.html' },
  bmi: { label: '대한비만학회 2022 비만 진단 지침', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10327686/' },
  protein: { label: 'ISSN 단백질·운동 입장문 (2017)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/' },
} as const;
