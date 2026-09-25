import type { Metadata } from 'next';
import ReviewLogin from './review-login';

export const metadata: Metadata = {
  title: 'App review login | 끼니플랜',
  robots: { index: false, follow: false },
};

export default function ReviewLoginPage() {
  return <ReviewLogin />;
}
