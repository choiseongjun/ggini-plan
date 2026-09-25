'use client';

import Link from 'next/link';
import {useIntakeStats} from './record-progress';
import {dailyReturnMessage} from '../lib/daily-return';
import {RiceBuddy} from './rice-buddy';
import './buddy-companion.css';

export function DailyReturnCard({userId,onRecord}:{userId:string;onRecord:()=>void}) {
  const {stats}=useIntakeStats(userId);
  // A missing or failed response must never look like zero records.
  if(!stats)return null;
  const message=dailyReturnMessage(stats.streak.loggedToday,stats.week.days);
  return <section className="daily-return" aria-label="오늘의 기록 습관">
    {stats.buddy&&<Link className="daily-buddy-link" href="/profile#buddy-companion"><RiceBuddy stage={stats.buddy.stage}/><span>Lv. {stats.buddy.level} 끼니 · 함께한 {stats.buddy.days}일</span></Link>}
    <div><span className="daily-return-kicker">하루 한 끼, 나를 챙기는 습관</span><h2>{message.title}</h2><p>{message.description}</p></div>
    <div className="daily-return-actions">{stats.streak.loggedToday?<Link href={message.href}>{message.label}</Link>:<button type="button" onClick={onRecord}>{message.label}</button>}<Link href="/profile#meal-reminders">식사 알림 설정</Link></div>
  </section>;
}
