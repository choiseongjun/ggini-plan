import type {ReactNode} from 'react';
import PlannerApp from '../planner-app';

// Keep authentication and shared app state mounted while tab routes change.
export default function PlannerLayout({children}:{children:ReactNode}){
 return <><PlannerApp/>{children}</>;
}
