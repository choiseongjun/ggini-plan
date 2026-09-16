export const googleAuthErrors = {
  google_cancelled: "구글 로그인을 취소했어요. 원할 때 다시 시작해 주세요.",
  google_expired: "로그인 요청이 만료됐어요. 구글 로그인을 다시 시작해 주세요.",
  google_unavailable: "구글 로그인 연결을 준비 중이에요. 이메일 로그인이나 둘러보기를 이용해 주세요.",
  google_account_exists: "이미 이메일로 가입한 계정이에요. 기존 이메일과 비밀번호로 로그인해 주세요.",
  google_failed: "구글 로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export type GoogleAuthErrorCode = keyof typeof googleAuthErrors;
