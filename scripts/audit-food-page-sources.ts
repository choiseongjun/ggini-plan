// Read-only audit: node --env-file=.env.local --import tsx scripts/audit-food-page-sources.ts
import {getPool} from '../lib/db';
import {foodProvenance} from '../lib/food-provenance';
async function main(){const db=getPool();
try{
 const {rows}=await db.query(`WITH snapshots AS (
 SELECT DISTINCT ON(s.food_code) s.food_code,s.raw_record FROM kfind_nutrition_snapshots s JOIN kfind_import_files f USING(source_sha256)
 WHERE f.completed_at IS NOT NULL ORDER BY s.food_code,s.source_date DESC NULLS LAST,s.source_sha256
 ) SELECT p.slug,r.*,s.raw_record FROM food_pages p JOIN food_reference r ON r.food_code=p.food_code LEFT JOIN snapshots s ON s.food_code=r.food_code`);
 const summary={pages:rows.length,matched:0,missingSource:0,mismatched:0,missingDate:0,invalidAmount:0,unitMismatch:0,basisOnly:0,missingServingLabel:0};
 const issues:{code:string;slug:string;reason:string}[]=[];
 for(const row of rows){
  const source=foodProvenance(row,row.raw_record??null);
  if(!source)summary.missingSource++;else if(source.matches)summary.matched++;else{summary.mismatched++;issues.push({code:row.food_code,slug:row.slug,reason:'summary_source_mismatch'});}
  if(!source?.sourceDate)summary.missingDate++;
  if(!(Number(row.basis_amount)>0)||row.serving_amount!==null&&!(Number(row.serving_amount)>0)){summary.invalidAmount++;issues.push({code:row.food_code,slug:row.slug,reason:'invalid_amount'});}
  if(row.serving_amount!==null&&row.serving_unit&&row.serving_unit!==row.basis_unit){summary.unitMismatch++;issues.push({code:row.food_code,slug:row.slug,reason:'unit_mismatch'});}
  if(row.serving_amount===null)summary.basisOnly++;
  if(!source?.servingText)summary.missingServingLabel++;
 }
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),summary,issues},null,2));
}finally{await db.end();}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
