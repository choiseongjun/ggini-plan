import {NextRequest} from 'next/server';
import {getPool} from '../../../lib/db';
import {catalogItems} from '../../../lib/catalog-db';
import {comparisonDay,comparisonProduct,comparisonRankingSql,comparisonVisitor,recordComparison} from '../../../lib/comparison-interest';
export const runtime='nodejs';
export async function POST(request:NextRequest) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403});
  try {
    const raw=await request.text();
    if(raw.length>1000)return new Response(null,{status:413});
    let id:string|null;try{id=comparisonProduct(JSON.parse(raw));}catch{return new Response(null,{status:400});}
    if(!id)return new Response(null,{status:400});
    // Local previews never contribute to the public ranking.
    if(process.env.VERCEL_ENV!=='production')return new Response(null,{status:204});
    const address=request.headers.get('x-vercel-forwarded-for');
    if(!address)return new Response(null,{status:204});
    const day=comparisonDay(),visitor=comparisonVisitor(day,address,process.env.DATABASE_URL!);
    const c=await getPool().connect();
    try {
      await c.query('BEGIN');
      const accepted=await recordComparison(c,id,day,visitor);
      await c.query('DELETE FROM comparison_interest WHERE event_day<$1::date-6',[day]);
      await c.query('COMMIT');
      return new Response(null,{status:accepted?204:429});
    }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
  }catch{return new Response(null,{status:503});}
}
export async function GET() {
  try {
    const day=comparisonDay();
    const [ranking,items]=await Promise.all([getPool().query<{product_id:string;comparisons:number}>(comparisonRankingSql,[day]),catalogItems()]);
    const byId=new Map(items.map(p=>[p.id,p]));
    return Response.json({day,items:ranking.rows.flatMap(row=>{const item=byId.get(row.product_id);return item?[{item,comparisons:row.comparisons}]:[];})},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300'}});
  }catch{return Response.json({error:'비교 기록을 불러오지 못했어요.'},{status:503});}
}
