import type { ReactNode } from "react";

const dot = (cx: number, cy: number, r = 0.9) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
const blush = (cx: number, cy: number) => <ellipse cx={cx} cy={cy} rx="1.3" ry=".8" fill="currentColor" stroke="none" opacity=".28" />;

const paths = {
  face: <><circle cx="12" cy="12" r="8.5" />{dot(9.3, 10.8)}{dot(14.7, 10.8)}<path d="M9.6 14.2c1.3 1.3 3.5 1.3 4.8 0" />{blush(7.6, 13.3)}{blush(16.4, 13.3)}</>,
  scale: <><rect x="3.5" y="3.5" width="17" height="17" rx="5.5" /><path d="M8.3 10.5a3.7 3.7 0 0 1 7.4 0Z" /><path d="m12 10.3 1.6-1.9" />{dot(9, 16.5, .8)}{dot(15, 16.5, .8)}</>,
  sneaker: <><path d="M3.5 16.5v-6c0-.6.4-1 1-1h2.3l1.4 1.8 2-.8 2.6 2.6 5.3 1.3c1.6.4 2.4 1.6 2.4 2.9v.2H4.5a1 1 0 0 1-1-1Z" /><path d="M3.5 17.5v.5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-.5M9.4 13.3l1.1-1M11.6 14.6l1.1-1" /></>,
  flag: <><path d="M6 20.5V4" /><path d="M6 4.8c2.2-1.3 4.4-1.3 6.2 0s4 1.3 6.3 0v8c-2.3 1.3-4.5 1.3-6.3 0s-4-1.3-6.2 0" />{dot(12.2, 8.8, .8)}</>,
  bowl: <><path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0Z" /><path d="M6.6 12.4a2.6 2.6 0 0 1 4.9-1.2 2.6 2.6 0 0 1 4.9 1.2M13.8 3.5l5.2 5.4M16.6 3l3.9 4.4" /></>,
  nope: <><circle cx="12" cy="12" r="8.5" /><path d="m6.2 6.2 11.6 11.6" /><path d="M13.6 8.4c1.8-.4 3 .4 3.2 2-1.6.4-2.8-.3-3.2-2Z" /></>,
  flame: <><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.3-5.6 3.8-7.6.4 1.7 1.3 2.8 2.4 3.3C11.5 7.2 13 4.8 15 3c.3 3 1.5 4.6 2.6 6.2 1 1.4 1.9 3 1.9 5.2 0 3.9-3.3 6.6-7.5 6.6Z" /><path d="M12 21c-1.7 0-2.9-1.2-2.9-2.8 0-1.7 1.3-2.7 2.3-3.9.3 1 .9 1.6 1.6 1.8.2-.9.6-1.6 1.1-2.1.7 1 1 2 1 3 0 2.3-1.3 4-3.1 4Z" /></>,
  female: <><circle cx="12" cy="13.5" r="6.5" /><circle cx="12" cy="4.6" r="2.1" /><path d="M5.8 11.8c2.6.2 5-1 6.2-3 1.2 2 3.6 3.2 6.2 3" />{dot(9.7, 14)}{dot(14.3, 14)}{blush(8.2, 16.2)}{blush(15.8, 16.2)}</>,
  male: <><circle cx="12" cy="13" r="7" /><path d="M5.2 11.5c2.4-.1 4.4-1.3 5.4-3.3 1.4 2 3.9 3.2 8.2 3.3M10.6 8.2c-.2-1.4.3-2.6 1.4-3.3" />{dot(9.6, 13.8)}{dot(14.4, 13.8)}{blush(8, 16)}{blush(16, 16)}</>,
  sofa: <><path d="M5 11V8.8A2.8 2.8 0 0 1 7.8 6h8.4A2.8 2.8 0 0 1 19 8.8V11" /><path d="M3 13a1.6 1.6 0 0 1 3.2 0v2h11.6v-2a1.6 1.6 0 0 1 3.2 0v5H3Z" /><path d="M5 18v1.6M19 18v1.6" /></>,
  walk: <><circle cx="13.5" cy="4.6" r="1.9" /><path d="M12.6 8.4 11 14l2.6 2.6.9 3.9M11 14l-2.4 6.1M9.2 11.4l2.4-2.9 2.8 1.6 1.9 2.4" /></>,
  run: <><circle cx="15.5" cy="4.5" r="1.9" /><path d="m8 9.8 3.6-1.7 3 2.1-2 3.8 3 2.6-1 3.9M12.6 14l-3 2.6H6.3M14.6 10.2l2.4 2.4 2.7-.6" /></>,
  dumbbell: <><path d="M6.5 7.5v9M17.5 7.5v9M4 10v4M20 10v4M6.5 12h11" /></>,
  leaf: <><path d="M5 19.5C5 11 10 5 19 5c0 9-6 14.5-14 14.5Z" /><path d="M5 19.5 13.5 11" /></>,
  balance: <><path d="M12 4.5v15.5M8.5 20h7M5.5 7.5h13" />{dot(12, 4.2, 1.2)}<path d="m5.5 7.5-2.4 5.2a2.4 2.4 0 0 0 4.8 0Zm13 0-2.4 5.2a2.4 2.4 0 0 0 4.8 0Z" /></>,
  bolt: <><path d="M13.2 3 5.5 13.5h6l-1 7.5 8-10.5h-6Z" /></>,
  egg: <><path d="M12 3.5c3.4 0 6.2 5 6.2 9.6a6.2 6.2 0 0 1-12.4 0c0-4.6 2.8-9.6 6.2-9.6Z" /><circle cx="12" cy="13.6" r="2.3" /></>,
  sprout: <><path d="M12 20.5V12M12 12c0-3.4-2.5-6-6.6-6 0 3.8 2.6 6 6.6 6ZM12 10.2c0-3 2.2-5.6 6.6-5.6 0 3.6-2.7 5.6-6.6 5.6Z" /></>,
  timer: <><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V10M10 3.2h4M18.2 6.8l1.3-1.3" /></>,
} satisfies Record<string, ReactNode>;

export type ProfileIconName = keyof typeof paths;

export function ProfileIcon({ name, size = 22 }: { name: ProfileIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
