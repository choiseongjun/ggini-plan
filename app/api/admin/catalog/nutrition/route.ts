import {NextRequest} from 'next/server';
import {adminUser} from '../../../../../lib/admin';
import {sameOrigin} from '../../../../../lib/auth';
import {getPool} from '../../../../../lib/db';
import {collectNutrition, completeNutrition} from '../../../../../lib/nutrition-collector';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function handle(request: NextRequest, save: boolean) {
  if (!sameOrigin(request)) return Response.json({error: '요청 출처가 올바르지 않습니다.'}, {status: 403});
  try {
    const user = await adminUser(request);
    if (!user) return Response.json({error: '관리자 권한이 필요합니다.'}, {status: 403});
    const raw = await request.text();
    if (raw.length > 4096) return Response.json({error: '요청이 너무 큽니다.'}, {status: 400});
    const input = JSON.parse(raw);
    if (typeof input.id !== 'string' || input.id.length > 100 || (input.imageIndex !== undefined && (!Number.isInteger(input.imageIndex) || input.imageIndex < 0 || input.imageIndex > 7))) return Response.json({error: '상품을 선택해 주세요.'}, {status: 400});
    const item = (await getPool().query('SELECT id,product_url,updated_at::text AS version FROM catalog_items WHERE id=$1', [input.id])).rows[0];
    if (!item) return Response.json({error: '상품을 찾을 수 없습니다.'}, {status: 404});
    if (!save) return Response.json({...await collectNutrition(item.product_url, input.imageIndex), version: item.version}, {headers: {'Cache-Control': 'no-store'}});
    const n = input.extracted;
    if (!n || typeof n.nutritionBasis !== 'string' || n.nutritionBasis.length > 80 || !completeNutrition(n) || input.sourceUrl !== item.product_url || typeof input.version !== 'string' || !Number.isFinite(Date.parse(input.version))) return Response.json({error: '기준량·영양 수치·출처를 확인해 주세요.'}, {status: 400});
    const result = await getPool().query(`UPDATE catalog_items SET nutrition_basis=$2,calories_kcal=$3,protein_g=$4,carbohydrates_g=$5,fat_g=$6,sodium_mg=$7,nutrition_source_name='판매처 영양정보 · 관리자 확인',nutrition_source_url=$8,updated_by=$9,updated_at=NOW() WHERE id=$1 AND updated_at=$10::timestamptz`, [item.id,n.nutritionBasis,n.caloriesKcal,n.proteinG,n.carbohydratesG,n.fatG,n.sodiumMg,item.product_url,user.id,input.version]);
    if (!result.rowCount) return Response.json({error: '상품 정보가 변경됐습니다. 다시 읽은 후 저장해 주세요.'}, {status: 409});
    return Response.json({saved: true}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    console.error('Nutrition collection failed', error);
    return Response.json({error: error instanceof Error && /판매처|원문|영양표|인식 시간|상품 또는|선택한|현재 컬리/.test(error.message) ? error.message : '영양정보를 가져오지 못했습니다. 상품 원문을 확인해 주세요.'}, {status: 400});
  }
}
export async function POST(request: NextRequest) { return handle(request, false); }
export async function PUT(request: NextRequest) { return handle(request, true); }
