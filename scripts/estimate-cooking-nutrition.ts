// Preview: node --env-file=.env.local --import tsx scripts/estimate-cooking-nutrition.ts
// Apply missing values only: append --apply. Existing estimates are reused on later runs.
import {catalogItems} from '../lib/catalog-db';
import {cookingProducts} from '../lib/cooking-recipes';
import {estimateNutrition,nutrientKeys} from '../lib/nutrition-estimate';
import {getPool} from '../lib/db';

async function main(){
 const catalog=await catalogItems();
 const used=new Set(cookingProducts(catalog).flatMap(p=>p.recipe?.ingredients.map(i=>i.product.id)??[]));
 const targets=catalog.filter(p=>used.has(p.id)&&nutrientKeys.some(k=>p[k]===null));
 console.log(JSON.stringify({ingredients:used.size,missing:targets.length,apply:process.argv.includes('--apply')}));
 if(!process.argv.includes('--apply'))return;
 let saved=0,skipped=0;
 for(let offset=0;offset<targets.length;offset+=3){
  await Promise.all(targets.slice(offset,offset+3).map(async p=>{
   const basis=p.nutritionBasis?.replace(/ · 추정 포함/g,'').trim()||(/달걀|계란/.test(p.name)?'1개당':'100g당');
   // Do not reinterpret component tables or unknown serving sizes.
   if(!/^(?:가식부|총내용량)?\d+(?:\.\d+)?(?:g|개)(?:당|기준)?$/.test(basis.replaceAll(' ',''))){skipped++;return;}
   const known={nutritionBasis:basis,...Object.fromEntries(nutrientKeys.map(k=>[k,p[k]]))};
   const result=await estimateNutrition(p.name,`${p.detail}. 판매 상태의 재료 기준. 별도로 추가할 소금, 소스, 식용유는 제외. 달걀의 개당 추정이면 가식부 중량 가정을 note에 표시.`,known);
   if(!result.estimate){skipped++;return;}
   const n=result.extracted;
   const grams=basis.replaceAll(' ','').match(/^(?:가식부|총내용량)?(\d+(?:\.\d+)?)g/);
   if(grams){
    const weight=Number(grams[1]);
    if((n.caloriesKcal??0)>weight*9.5||(n.proteinG??0)+(n.carbohydratesG??0)+(n.fatG??0)>weight*1.05||(n.sodiumMg??0)>weight*1000){skipped++;return;}
   }
   // A concurrent admin edit wins; never overwrite its newer values or basis.
   const metadata={...result.estimate,fields:[...new Set([...(p.nutritionEstimate?.fields??[]),...result.estimate.fields])],note:[p.nutritionEstimate?.note,result.estimate.note].filter(Boolean).join(' ').slice(0,2000)};
   const update=await getPool().query(`UPDATE catalog_items SET nutrition_basis=$2,calories_kcal=$3,protein_g=$4,carbohydrates_g=$5,fat_g=$6,sodium_mg=$7,nutrition_estimate=$8::jsonb,nutrition_source_name='AI 추정 포함 · 실제 제품과 차이 가능',updated_at=NOW() WHERE id=$1 AND date_trunc('milliseconds',updated_at)=$9::timestamptz`,[p.id,basis,n.caloriesKcal,n.proteinG,n.carbohydratesG,n.fatG,n.sodiumMg,JSON.stringify(metadata),p.updatedAt]);
   if(update.rowCount)saved++;else skipped++;
   console.log(JSON.stringify({id:p.id,saved:Boolean(update.rowCount),fields:result.estimate.fields}));
  }));
 }
 console.log(JSON.stringify({saved,skipped}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Estimation failed');process.exitCode=1;}).finally(()=>getPool().end());
