'use client';
import {trackAnalytics} from './analytics';
import type {PlannerEvent} from './planner-events';
export function trackPlanner(event:PlannerEvent){
 if(event==='generated')trackAnalytics('recommendation_completed');
 if(event==='swapped')trackAnalytics('menu_swapped');
 if(event==='snack_logged')trackAnalytics('meal_recorded',{method:'search'});
 try{
  const key='ggini-planner-visitor';let identity=JSON.parse(localStorage.getItem(key)??'null');
  if(!identity||typeof identity.id!=='string'||!Number.isFinite(identity.until)||identity.until<Date.now()){identity={id:crypto.randomUUID(),until:Date.now()+30*86400000};localStorage.setItem(key,JSON.stringify(identity));}
  void fetch('/api/planner-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,visitor:identity.id}),keepalive:true}).catch(()=>{});
 }catch{/* Measurement never blocks planning, including when storage is disabled. */}
}
