import {Suspense} from 'react';
import AppLogin from './screen';
export const metadata={title:'앱 로그인 | 끼니플랜',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <Suspense fallback={<p>앱 로그인을 준비하고 있어요.</p>}><AppLogin/></Suspense>;}
