'use client';

import Link from 'next/link';
import {useIntakeStats} from './record-progress';
import {RiceBuddy} from './rice-buddy';
import './buddy-companion.css';

export function DailyReturnCard({userId,onRecord}:{userId:string;onRecord:()=>void}) {
  const {stats}=useIntakeStats(userId);
  // A missing or failed response must never look like zero records.
  if(!stats)return null;
  return <section className="daily-return daily-return-compact" aria-label="오늘의 기록 습관">
    {stats.buddy&&<Link className="daily-buddy-link" href="/profile#buddy-companion"><RiceBuddy stage={stats.buddy.stage}/><span>Lv. {stats.buddy.level} 끼니 · 함께한 {stats.buddy.days}일</span></Link>}
    {stats.streak.loggedToday?<Link className="daily-return-record" href="/record">오늘 기록 보기</Link>:<button className="daily-return-record" type="button" onClick={onRecord}>한 끼 기록하기</button>}
  </section>;
}
