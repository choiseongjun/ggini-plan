# GPT 영양표 자동 입력

## 설정

로컬 `.env.local`에 아래 한 줄을 채우고 개발 서버를 재시작합니다.

```dotenv
OPENAI_API_KEY=발급받은_API_키
```

배포 사이트는 Vercel → 프로젝트 → Settings → Environment Variables에 같은 이름으로 키를 등록하고 재배포합니다. Production 환경에 적용해야 실제 사이트에 반영됩니다. 키를 Git에 커밋하거나 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

선택 사항: `OPENAI_NUTRITION_MODEL`로 모델을 바꿀 수 있습니다. 기본값은 `gpt-4.1`이며 이미지 입력, Responses API, Structured Outputs를 지원하는 모델이어야 합니다.

## 사용

- `/admin/collect`: 영양성분 읽기 버튼을 누르면 판매처 표시사항 사진과 원문을 GPT가 읽어 결과 입력칸을 채웁니다.
- `/admin`: 영양표 사진을 첨부하거나 영역을 선택해 다시 읽으면 같은 GPT 인식기를 사용합니다.
- 설정 상태에 `GPT 영양표 자동 입력`이 표시되면 키가 서버에 설정된 상태입니다. 이는 실제 키 유효성·결제 상태 검증은 아닙니다. 실제 읽기 요청으로 확인하세요.
- 기준량, 열량, 단백질, 탄수화물, 지방, 나트륨을 확인하고 저장합니다. 읽기만으로 DB를 바꾸지 않습니다.
- 여러 구성품 표를 합산하지 않으며, 누락되거나 불명확한 값은 null로 남깁니다. 일반 음식 데이터로 보충하지 않습니다.
- 키가 없으면 기존 OCR을 사용합니다. 키가 있는데 인증·한도·연결 문제가 발생하면 오류를 표시합니다.
- OpenAI 요청은 서버에서만 보내고 `store: false`를 사용합니다. 사진·영양 원문 외 계정정보는 전송하지 않습니다. API 비용은 해당 키의 OpenAI 프로젝트에 청구됩니다.

## 참고

- [OpenAI 이미지 입력](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI 구조화 응답](https://developers.openai.com/api/docs/guides/structured-outputs)
