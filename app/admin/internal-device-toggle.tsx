'use client';
import {useEffect,useState} from 'react';
import {Checkbox} from '../components/checkbox';
import {isInternalDevice,setInternalDevice} from '../../lib/internal-traffic';
export function InternalDeviceToggle(){
 const [internal,setInternal]=useState<boolean|null>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>setInternal(isInternalDevice()));return()=>cancelAnimationFrame(frame);},[]);
 return <section style={{margin:'16px 0',padding:16,border:'1px solid #dfe6da',borderRadius:12}}>
  <label style={{display:'flex',gap:8,alignItems:'center',fontWeight:600}}><Checkbox checked={internal===true} disabled={internal===null} onChange={e=>{setInternalDevice(e.target.checked);setInternal(e.target.checked);}}/>이 기기를 지표에서 제외</label>
  <p style={{margin:'8px 0 0',fontSize:13,color:'#5d6b58'}}>켜면 이 브라우저의 방문·추천·클릭이 아래 지표, PostHog, GA4, Vercel 방문 집계에 들어가지 않아요. 내가 쓰는 휴대폰·PC·앱마다 한 번씩 켜 주세요. 앱이나 다른 브라우저에서는 주소 끝에 <code>?internal=1</code>을 붙여 열어도 돼요(<code>?internal=0</code>은 해제).</p>
 </section>;
}
