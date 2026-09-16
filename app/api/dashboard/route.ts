import { NextRequest, NextResponse } from "next/server";
import { sessionUser, sameOrigin, authFailure } from "../../../lib/auth";
import { getPool } from "../../../lib/db";
import { expenseCategories } from "../../../lib/dashboard";
export const runtime="nodejs";
const json=(data:unknown)=>NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
const week="date_trunc('week',NOW() AT TIME ZONE 'Asia/Seoul')::date";
export async function GET(request:NextRequest){try{
 const user=await sessionUser(request);const db=getPool();
 const dates=(await db.query(`SELECT to_char((NOW() AT TIME ZONE 'Asia/Seoul')::date,'YYYY-MM-DD') AS today,to_char(${week},'YYYY-MM-DD') AS week`)).rows[0];
 if(!user)return json({...dates,budget:null,expenses:[],plans:[]});
 const [budget,expenses,plans]=await Promise.all([
 db.query(`SELECT amount FROM weekly_budgets WHERE user_id=$1 AND week_start=${week}`,[user.id]),
 db.query(`SELECT to_char(spent_on,'YYYY-MM-DD') AS date,category,amount FROM daily_expenses WHERE user_id=$1 ORDER BY spent_on DESC LIMIT 2000`,[user.id]),
 db.query(`SELECT DISTINCT ON ((created_at AT TIME ZONE 'Asia/Seoul')::date) id::text,to_char(created_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AS date,recommendation FROM meal_plans WHERE user_id=$1 ORDER BY (created_at AT TIME ZONE 'Asia/Seoul')::date DESC,created_at DESC,id DESC LIMIT 366`,[user.id])]);
 return json({...dates,budget:budget.rows[0]?.amount??null,expenses:expenses.rows,plans:plans.rows});
 }catch{return authFailure("내 기록을 불러오지 못했어요.",503);}}
export async function PUT(request:NextRequest){if(!sameOrigin(request))return authFailure("요청을 확인해 주세요.",403);try{
 const user=await sessionUser(request);if(!user)return authFailure("로그인이 필요해요.",401);
 let p;try{p=await request.json();}catch{return authFailure("입력을 확인해 주세요.",400);}
 if(!p||!Number.isSafeInteger(p.amount)||p.amount<0||p.amount>10000000)return authFailure("금액을 확인해 주세요.",400);
 if(p.action==="budget"){
 if(p.amount<1)return authFailure("예산은 1원 이상 입력해 주세요.",400);
 await getPool().query(`INSERT INTO weekly_budgets(user_id,week_start,amount) VALUES($1,${week},$2) ON CONFLICT(user_id,week_start) DO UPDATE SET amount=EXCLUDED.amount`,[user.id,p.amount]);
 }else if(p.action==="expense"){
 if(typeof p.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||Number.isNaN(Date.parse(p.date))||new Date(p.date).toISOString().slice(0,10)!==p.date||typeof p.category!=="string"||!Object.hasOwn(expenseCategories,p.category))return authFailure("날짜와 지출 항목을 확인해 주세요.",400);
 await getPool().query(`INSERT INTO daily_expenses(user_id,spent_on,category,amount) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,spent_on,category) DO UPDATE SET amount=EXCLUDED.amount,updated_at=NOW()`,[user.id,p.date,p.category,p.amount]);
 }else return authFailure("지원하지 않는 요청이에요.",400);
 return json({ok:true});
 }catch{return authFailure("기록을 저장하지 못했어요.",503);}}
