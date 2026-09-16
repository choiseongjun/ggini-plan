import type { recommendMeals } from "./meal-plan";
export const expenseCategories={food:"식비",transport:"교통",household:"생활용품",other:"기타"} as const;
export type DashboardData={today:string;week:string;budget:number|null;expenses:{date:string;category:keyof typeof expenseCategories;amount:number}[];plans:{id:string;date:string;recommendation:NonNullable<ReturnType<typeof recommendMeals>>}[]};
export function dateKey(date:Date){return date.toISOString().slice(0,10);}
export function addDays(key:string,n:number){const d=new Date(`${key}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return dateKey(d);}
export function emptyDashboard(now = new Date()): DashboardData {
 const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0,10);
 const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
 return {today,week:addDays(today,-((weekday+6)%7)),budget:null,plans:[],expenses:[]};
}
