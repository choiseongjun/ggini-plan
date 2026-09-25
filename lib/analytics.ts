'use client';
import {analyticsScreen,sanitizeAnalytics,type AnalyticsEvent,type AnalyticsProperties} from './analytics-events';
import type {PostHog} from 'posthog-js';
let client:Promise<PostHog|null>|undefined;
function getClient(){
 const token=process.env.NEXT_PUBLIC_POSTHOG_KEY;
 const host=process.env.NEXT_PUBLIC_POSTHOG_HOST;
 if(typeof window==='undefined'||!token||!host||!['gginiplan.kr','www.gginiplan.kr'].includes(window.location.hostname)||navigator.doNotTrack==='1')return Promise.resolve(null);
 if(!client)client=import('posthog-js').then(({default:posthog})=>{
  posthog.init(token,{
   api_host:host,persistence:'localStorage',person_profiles:'never',
   autocapture:false,capture_pageview:false,capture_pageleave:false,
   capture_dead_clicks:false,capture_heatmaps:false,capture_performance:false,capture_exceptions:false,
   disable_session_recording:true,disable_surveys:true,disable_external_dependency_loading:true,
   advanced_disable_flags:true,ip:false,save_referrer:false,save_campaign_params:false,respect_dnt:true,
   before_send:event=>{
    if(!event)return null;
    const properties=sanitizeAnalytics(event.event,event.properties);
    return properties?{event:event.event,uuid:event.uuid,timestamp:event.timestamp,properties:{...properties,token}}:null;
   },
  });
  return posthog;
 }).catch(()=>{client=undefined;return null;});
 return client;
}
export function trackAnalytics(event:AnalyticsEvent,properties:AnalyticsProperties={}){
 if(typeof window==='undefined')return;
 const screen=analyticsScreen(window.location.pathname);if(!screen)return;
 // Never await analytics in a user action; blocked analytics cannot block a meal log.
 void getClient().then(ph=>{try{ph?.capture(event,{...properties,screen});}catch{/* optional telemetry */}}).catch(()=>{});
}
