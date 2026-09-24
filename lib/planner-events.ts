import {createHmac} from 'node:crypto';
import type {PoolClient} from 'pg';
export const plannerEvents=['visit','generated','swapped','seller','photo_logged','weight_logged','push_enabled','push_opened','push_logged','push_action_logged'] as const;
export type PlannerEvent=typeof plannerEvents[number];
export function parsePlannerEvent(raw:unknown):{event:PlannerEvent;visitor:string}|null{
 if(!raw||typeof raw!=='object')return null;const p=raw as Record<string,unknown>;
 if(typeof p.visitor!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.visitor)||!plannerEvents.includes(p.event as PlannerEvent))return null;
 return {event:p.event as PlannerEvent,visitor:p.visitor};
}
export const plannerVisitor=(id:string,secret:string)=>createHmac('sha256',secret).update('planner:'+id).digest('hex');
export async function savePlannerEvent(c:PoolClient,visitor:string,event:PlannerEvent,day:string){
 await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[visitor]);
 if(event==='visit')await c.query(`INSERT INTO planner_events(day,visitor_hash,event) SELECT $1,$2,'returned' WHERE EXISTS(SELECT 1 FROM planner_events WHERE visitor_hash=$2 AND event='visit' AND day<$1::date AND day>=$1::date-29) ON CONFLICT DO NOTHING`,[day,visitor]);
 await c.query('INSERT INTO planner_events(day,visitor_hash,event) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[day,visitor,event]);
 await c.query('DELETE FROM planner_events WHERE day<$1::date-29',[day]);
}
