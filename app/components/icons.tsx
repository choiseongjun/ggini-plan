// 끼니플랜 선 아이콘. 이모지 대신 이 아이콘을 쓴다(docs/design-guide.md).
import type {ReactNode} from 'react';
export type IconName = "home" | "bag" | "chart" | "user" | "users" | "chevron" | "arrow" | "check" | "spark" | "calendar" | "wallet" | "fire" | "close" | "edit" | "left";


export function Icon({ name, size = 20, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
    bag: <><path d="M4 8h16l-1.3 12H5.3L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    chart: <><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M4 20a5 5 0 0 1 10 0"/><circle cx="17" cy="9" r="2.5"/><path d="M14.5 20a4.5 4.5 0 0 1 8 0"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    left: <path d="m15 18-6-6 6-6"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13m-1 12h4m-3 0h.01"/></>,
    fire: <path d="M12 22c4.5 0 7-3.2 7-7 0-2.5-1.2-4.4-3-6-1 2-2 2.5-2 2.5C14 7 12 4.5 10 2c.5 4-1 5.5-3 7.5C5.5 11 5 12.8 5 15c0 3.8 2.5 7 7 7Z"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    edit: <><path d="m4 20 4-.8L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/><path d="m15 6 3 3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
