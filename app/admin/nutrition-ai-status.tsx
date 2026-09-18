"use client";
import {useEffect,useState} from 'react';

export function NutritionAIStatus() {
  const [config,setConfig]=useState<{configured:boolean;model:string}|null>(null);
  const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    fetch('/api/admin/ocr',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('인식 서비스 설정을 확인하지 못했습니다.');
      const data=await response.json();if(active){setConfig(data);setError('');}
    }).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[attempt]);
  return <div className="admin-ai-status" role="status">
    <strong>{error||(!config?'영양표 인식 설정 확인 중…':config.configured?`GPT 영양표 자동 입력 · ${config.model}`:'GPT API 키 미설정 · 기본 OCR 사용 중')}</strong>
    {config?.configured?<p>사진과 영양 표시 원문을 OpenAI로 보내 읽고 입력칸을 채웁니다. 기준량·수치를 확인한 뒤 저장해 주세요.</p>:config&&<details><summary>API 키 설정 방법</summary><p>로컬은 <code>.env.local</code>, 배포 사이트는 Vercel의 Environment Variables에 <code>OPENAI_API_KEY</code>를 추가하세요. 로컬 서버 재시작 또는 재배포 후 적용됩니다. 키를 입력하면 기존 읽기 버튼이 자동으로 GPT를 사용합니다.</p><p>모델 변경은 선택 사항: <code>OPENAI_NUTRITION_MODEL</code>. 키는 서버 환경변수로만 설정하세요.</p></details>}
    <button type="button" onClick={()=>setAttempt(v=>v+1)}>설정 상태 새로 확인</button>
  </div>;
}
