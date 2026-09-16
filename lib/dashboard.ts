import type { recommendMeals } from "./meal-plan";
export const expenseCategories={food:"식비",transport:"교통",household:"생활용품",other:"기타"} as const;
export type DashboardData={today:string;week:string;budget:number|null;expenses:{date:string;category:keyof typeof expenseCategories;amount:number}[];plans:{id:string;date:string;recommendation:NonNullable<ReturnType<typeof recommendMeals>>}[]};
export function dateKey(date:Date){return date.toISOString().slice(0,10);}
export function addDays(key:string,n:number){const d=new Date(`${key}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return dateKey(d);}
