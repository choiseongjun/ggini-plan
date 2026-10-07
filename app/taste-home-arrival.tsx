'use client';
import {useEffect,useRef} from 'react';
import {trackAnalytics} from '../lib/analytics';
export default function TasteHomeArrival(){
 const tracked=useRef(false);
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get('from')!=='taste'||tracked.current)return;
  tracked.current=true;trackAnalytics('taste_home_arrived');
  document.getElementById('today-meals')?.scrollIntoView({block:'start'});
 },[]);
 return null;
}
