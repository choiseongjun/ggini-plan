export function dailyReturnMessage(loggedToday: boolean, weekDays: number) {
  const days = Math.max(0, Math.min(7, Math.floor(weekDays)));
  if (loggedToday) return {
    title: '오늘도 한 끼, 잘 챙겼어요',
    description: `이번 주 ${days}일 기록했어요. 내일 먹은 한 끼도 남겨주세요.`,
    label: '이번 주 기록 보기', href: '/profile#weekly-report', days,
  };
  return {
    title: days > 0 ? '오늘 한 끼도 이어가 볼까요?' : '오늘 먹은 한 끼부터 시작해요',
    description: days > 0 ? `이번 주 ${days}일 기록했어요. 쉬었던 날이 있어도 괜찮아요.` : '먹은 것을 남기면 내 식사와 영양을 돌아볼 수 있어요.',
    label: '오늘 먹은 것 기록', href: '/record', days,
  };
}
