import {NextRequest, NextResponse, after} from 'next/server';
import {sessionUser, authFailure} from '../../../lib/auth';
import {generateAiGuide, personalGuide} from '../../../lib/weekly-guide-ai';
export const maxDuration = 60;

// 내 맞춤 가이드. AI 가이드가 없거나 오래됐으면 지금 가이드(규칙)를 먼저 보내고, 응답 뒤에 AI로 새로 만든다.
export async function GET(request: NextRequest) {
 try {
  const user = await sessionUser(request);
  if (!user) return authFailure('로그인이 필요해요.', 401);
  const {guide, needsRefresh} = await personalGuide(user.id);
  if (needsRefresh) after(() => generateAiGuide(user.id).catch(() => {}));
  return NextResponse.json({...guide, refreshing: needsRefresh}, {headers: {'Cache-Control': 'no-store'}});
 } catch {
  return authFailure('식단 가이드를 불러오지 못했어요.', 503);
 }
}
