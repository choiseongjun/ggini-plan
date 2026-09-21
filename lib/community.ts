import type {SharedPlan} from './shared-plan';
export type SharedItem = {id:string;name:string;price:number;emoji:string;detail:string};
export type CommunityPost = {id:string;alias:string;title:string;body:string;items:SharedItem[];style:string;createdAt:string;likes:number;liked:boolean;mine:boolean;plan:SharedPlan|null;hasPhoto:boolean;tips:{id:string;alias:string;body:string;mine:boolean}[]};
export type Challenge = {id:string;title:string;description:string;target:number;joined:boolean;progress:number;checked:boolean;members:number};
export type CommunityData = {posts:CommunityPost[];challenges:Challenge[];basket:{items:SharedItem[];budget:number}|null;week:string;pageSize?:number};
