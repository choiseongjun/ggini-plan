import {notFound} from 'next/navigation';
import Together from './together';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <Together/>;}
