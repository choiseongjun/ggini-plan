'use client';

import { AuthScreen } from '../auth-screen';
import { useRouter } from 'next/navigation';

export default function ReviewLogin() {
  const router = useRouter();
  const goHome = () => { router.replace('/'); router.refresh(); };
  return <AuthScreen review onSuccess={goHome} onExplore={goHome} />;
}
