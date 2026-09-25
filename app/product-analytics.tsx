'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {trackAnalytics} from '../lib/analytics';
export function ProductAnalytics(){
 const pathname=usePathname(),last=useRef<string|null>(null);
 useEffect(()=>{if(last.current===pathname)return;last.current=pathname;trackAnalytics('page_viewed');},[pathname]);
 return null;
}
