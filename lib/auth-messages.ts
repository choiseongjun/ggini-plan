export const googleAuthErrors = {
  google_consent_required: '처음 가입하려면 회원가입 탭에서 필수 동의 후 Google로 계속하기를 눌러 주세요.',
  google_cancelled: "구글 로그인을 취소했어요. 원할 때 다시 시작해 주세요.",
  google_expired: "로그인 요청이 만료됐어요. 구글 로그인을 다시 시작해 주세요.",
  google_unavailable: "구글 로그인 연결을 준비 중이에요. 이메일 로그인이나 둘러보기를 이용해 주세요.",
  google_account_exists: "이미 이메일로 가입한 계정이에요. 기존 이메일과 비밀번호로 로그인해 주세요.",
  google_failed: "구글 로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export type GoogleAuthErrorCode = keyof typeof googleAuthErrors;

export const kakaoAuthErrors={
 kakao_consent_required:'처음 이용하는 카카오 계정이에요. 필수 항목에 동의한 후 카카오로 계속하기를 다시 눌러 주세요.',
 kakao_cancelled:'카카오 로그인을 취소했어요. 원할 때 다시 시작해 주세요.',
 kakao_expired:'로그인 요청이 만료됐어요. 카카오 로그인을 다시 시작해 주세요.',
 kakao_unavailable:'카카오 로그인 연결을 준비 중이에요. 다른 로그인 방법을 이용해 주세요.',
 kakao_failed:'카카오 로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
} as const;
export type KakaoAuthErrorCode=keyof typeof kakaoAuthErrors;
export const authErrors={...googleAuthErrors,...kakaoAuthErrors};
export type AuthErrorCode=keyof typeof authErrors;
