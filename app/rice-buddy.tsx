import './rice-buddy.css';

export function RiceBuddy({ className = "", stage = 0, animate = false }: { className?: string; stage?: number; animate?: boolean }) {
  return <svg className={`rice-buddy ${animate?'rice-buddy-alive':''} ${className}`} viewBox="0 0 240 240" fill="none" aria-hidden="true">
    <ellipse cx="123" cy="221" rx="59" ry="9" fill="#426d87" opacity=".13"/>
    <g className="rice-buddy-body">
    <path d="M89 184L84 207Q83 219 96 218Q104 218 108 202M145 185L153 207Q159 219 146 220Q138 220 130 203" fill="#fff9e9"/>
    <path d="M69 128Q43 115 39 141Q38 153 67 159M171 127Q198 94 205 109Q215 122 179 155" fill="#fff9e9"/>
    <path d="M60 134C59 99 85 53 119 54C152 54 181 99 184 135C191 184 170 205 121 205C72 205 54 184 60 134Z" fill="#fffdf0"/>
    <path d="M91 66Q82 45 98 42Q115 40 122 59Q134 28 154 40Q163 49 134 65" fill="#5c9872"/>
    <path d="M82 98L89 94M102 78L108 76M147 87L153 91M164 111L169 116" stroke="#e9e3c9" strokeWidth="4" strokeLinecap="round"/>
    <g className="rice-buddy-eyes"><ellipse cx="94" cy="132" rx="5" ry="6" fill="#304953"/><ellipse cx="147" cy="132" rx="5" ry="6" fill="#304953"/></g>
    <ellipse cx="79" cy="146" rx="11" ry="6" fill="#ffb7a5"/><ellipse cx="160" cy="146" rx="11" ry="6" fill="#ffb7a5"/>
    <path d="M112 143Q121 154 130 143" stroke="#304953" strokeWidth="4" strokeLinecap="round"/>
    <path d="M108 175Q121 166 135 175L140 201Q122 207 102 201Z" fill="#426d57"/>
    {stage>=1&&<g><path d="M75 160Q120 181 169 158L164 171Q122 194 78 173Z" fill="#8bc7b0"/><path d="M147 172L164 169L175 192L157 188Z" fill="#66a58e"/></g>}
    {stage>=2&&<path d="M95 179Q120 186 148 176L153 204Q121 217 88 203Z" fill="#e9c895"/>}
    {stage>=3&&<g><path d="M121 201v-12M121 193q-12 0-10-9q11-1 10 9M121 190q0-10 11-9q1 9-11 9" stroke="#52866c" strokeWidth="3" strokeLinecap="round"/></g>}
    {stage>=4&&<g><path d="M88 66L83 52Q63 35 82 23Q91 17 102 25Q119 8 134 22Q156 14 164 31Q172 47 153 55L151 67Z" fill="#fffefa" stroke="#e2e6d9" strokeWidth="2"/><path d="M89 59Q119 54 151 59L151 69Q120 63 89 70Z" fill="#b8d9c4"/></g>}
    {stage>=5&&<g><path d="M131 171L140 191L149 174" stroke="#8eaed0" strokeWidth="6"/><circle cx="141" cy="195" r="10" fill="#edc56e" stroke="#d6a94e" strokeWidth="2"/><path d="m141 189 2 4 4 1-3 3v4l-3-2-4 2 1-4-3-3 4-1Z" fill="#fff9d6"/></g>}
    <g className="rice-buddy-spoon">
    <path d="M45 143L31 96" stroke="#d99458" strokeWidth="9" strokeLinecap="round"/>
    <ellipse cx="29" cy="84" rx="14" ry="21" transform="rotate(-18 29 84)" fill="#f4bc7d"/>
    <path d="M23 77L26 86" stroke="#ffe5be" strokeWidth="4" strokeLinecap="round"/>
    </g>
    <path d="M196 65L199 73L207 76L199 79L196 87L193 79L185 76L193 73Z" fill="#fff4a8"/>
    </g>
  </svg>;
}

export function BudgetBuddy({ budget, spent, cart, onEdit }: { budget: number; spent: number; cart: number; onEdit: () => void }) {
  const remaining = Math.max(0, budget - spent);
  const percent = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  return <section className="buddy-budget" aria-label="이번 주 식비 현황">
    <div className="buddy-budget-top"><span>🍚 이번 주 식비 플랜</span><button type="button" onClick={onEdit}>예산 수정 ↗</button></div>
    <div className="buddy-amount"><span>이번 주 남은 식비</span><strong>{remaining.toLocaleString("ko-KR")}<small>원</small></strong><p>전체 예산 {budget.toLocaleString("ko-KR")}원 중 {percent}% 사용했어요</p></div>
    <div className="buddy-scene"><svg className="buddy-arc" viewBox="0 0 320 190" aria-hidden="true"><path d="M28 164A132 132 0 0 1 292 164" fill="none" stroke="#b9d8ed" strokeWidth="25" strokeLinecap="round"/><path d="M28 164A132 132 0 0 1 292 164" fill="none" stroke="#f7e78f" strokeWidth="25" strokeLinecap="round" pathLength="100" strokeDasharray={`${percent} 100`}/></svg><RiceBuddy/><span className="buddy-speech">오늘도 든든하게!</span></div>
    <div className="buddy-budget-bottom"><div><span>지금까지 쓴 식비</span><strong>{spent.toLocaleString("ko-KR")}원</strong></div><span className="buddy-budget-divider"/><div><span>장바구니 예상</span><strong>{cart.toLocaleString("ko-KR")}원</strong></div></div>
  </section>;
}
