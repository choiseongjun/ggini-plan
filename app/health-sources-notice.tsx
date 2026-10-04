import Link from 'next/link';
import { healthSources } from '../lib/health-sources';
import styles from './health-sources.module.css';

export function HealthSourcesNotice({ compact = false }: { compact?: boolean }) {
  return <aside className={styles.notice} aria-label="건강·영양 정보 출처">
    <strong>건강·영양 정보 출처</strong>
    <p>일반적인 식사 참고용이며 진단·치료를 위한 식단이 아니에요.{!compact && ' 질환이 있거나 식단을 치료 목적으로 바꾸려면 의사·영양사와 상의해 주세요.'}</p>
    <div className={styles.links}>
      <a href={healthSources.nutrition.url} target="_blank" rel="noreferrer">한국인 영양소 섭취기준 ↗</a>
      {!compact && <a href={healthSources.energy.url} target="_blank" rel="noreferrer">열량 계산 논문 ↗</a>}
      <Link href="/health-sources">추천 기준·전체 출처 보기 →</Link>
    </div>
  </aside>;
}
