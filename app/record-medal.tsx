export function RecordMedal({badgeKey}:{badgeKey:string}){
 const count=badgeKey.match(/\d+/)?.[0];
 const green=badgeKey==='variety10'||badgeKey==='first';
 return <svg width="58" height="64" viewBox="0 0 64 70" fill="none" aria-hidden="true">
  <path d="m18 45-3 22 13-6 5 6 4-22M36 45l5 22 8-7 9 4-8-23" fill={green?'#8abca5':'#d3b888'}/>
  <path d="m32 3 8 4 9 1 4 8 6 7-2 9 1 9-8 5-6 7-9-1-9 2-7-6-8-4-1-9-3-9 6-7 3-9 9-2Z" fill={green?'#e0eee4':'#f7e9c9'} stroke={green?'#93b8a0':'#c9ac73'} strokeWidth="1.5"/>
  <circle cx="32" cy="29" r="19" fill="#fffdf6" stroke={green?'#b6d3bd':'#e3d1ab'}/>
  <path d="M20 36c-2-9 3-17 11-17s14 8 12 17c-5 4-18 4-23 0Z" fill="#f8f0d7" stroke="#dacbb0"/>
  <path d="M31 19c-8 0-8-7-8-7 7-1 10 3 8 7Zm1 0c0-7 7-8 10-6-1 5-5 7-10 6Z" fill="#79a783"/>
  <circle cx="27" cy="29" r="1.4" fill="#4b5545"/><circle cx="36" cy="29" r="1.4" fill="#4b5545"/><path d="M29 33q3 3 6 0" stroke="#4b5545" strokeWidth="1.3" strokeLinecap="round"/>
  <ellipse cx="17" cy="28" rx="3" ry="5" fill="#ba9870"/><path d="m17 32 2 10" stroke="#ba9870" strokeWidth="2.8" strokeLinecap="round"/>
  {count&&<><rect x="22" y="41" width="22" height="14" rx="7" fill={green?'#4e8065':'#94713d'}/><text x="33" y="51" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">{count}</text></>}
 </svg>;
}
