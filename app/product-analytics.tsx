'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {Analytics} from '@vercel/analytics/next';
import {trackAnalytics} from '../lib/analytics';
import {applyInternalParam,isInternalDevice} from '../lib/internal-traffic';
export function ProductAnalytics(){
 const pathname=usePathname(),last=useRef<string|null>(null);
 useEffect(()=>{if(last.current===pathname)return;last.current=pathname;trackAnalytics('page_viewed');applyInternalParam();},[pathname]);
 return null;
}
// Vercel page views also skip operator devices; the layout is a server component, so the callback lives here.
export function SiteAnalytics(){
 return <Analytics beforeSend={event=>isInternalDevice()?null:event}/>;
}
