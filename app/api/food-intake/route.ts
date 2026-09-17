import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {planProducts} from '../../../lib/shopping-plan-catalog';
import {parseStock} from '../../../lib/shopping-progress';
import {consumeFood,restoreFood,servingNutrition,stockPrecision,validPortions} from '../../../lib/food-intake';
import {emptyDashboard} from '../../../lib/dashboard';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validDate=(s:string)=>/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인하면 먹은 기록을 저장할 수 있어요.',401);
  const date=request.nextUrl.searchParams.get('date')??emptyDashboard().today;
  if(!validDate(date))return authFailure('날짜를 확인해 주세요.',400);
  const [progress,logs,products]=await Promise.all([
   getPool().query("SELECT stock,version FROM shopping_progress WHERE user_id=$1 AND scope='products'",[user.id]),
   getPool().query(`SELECT id::text,product_id AS "productId",product_name AS name,portions::float8,packs::float8,calories::float8,protein::float8,cost::float8,created_at AS "createdAt" FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND created_at>=($2::date::timestamp AT TIME ZONE 'Asia/Seoul') AND created_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Seoul') ORDER BY created_at DESC,id DESC`,[user.id,date]),
   planProducts(),
  ]);
  const stock=parseStock(progress.rows[0]?.stock??{});if(!stock)throw new Error('Invalid stock');
  return json({date,version:progress.rows[0]?.version??0,logs:logs.rows,products:products.filter(p=>stock[p.id]?.unit==='묶음'&&stock[p.id].owned>0).map(p=>({id:p.id,name:p.name,servingNote:p.servingNote,servings:p.servings,available:stockPrecision(stock[p.id].owned*p.servings),...servingNutrition(p),image:p.productImageUrl}))});
 }catch{return authFailure('먹은 기록을 불러오지 못했어요. 다시 시도해 주세요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  if(!input||!['eat','undo'].includes(input.action)||typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)||!Number.isSafeInteger(input.version)||input.version<0)return authFailure('기록을 확인해 주세요.',400);
  if(input.action==='eat'&&(typeof input.productId!=='string'||input.productId.length>100||!validPortions(input.portions)))return authFailure('상품과 먹은 양을 확인해 주세요.',400);
  const product=input.action==='eat'?(await planProducts()).find(p=>p.id===input.productId):null;
  const client=await getPool().connect();
  try{
   await client.query('BEGIN');
   // Serialize consumption with cart updates; the same stock version is shared by both APIs.
   const result=await client.query("SELECT stock,version FROM shopping_progress WHERE user_id=$1 AND scope='products' FOR UPDATE",[user.id]);
   const previous=(await client.query('SELECT * FROM food_intake_logs WHERE user_id=$1 AND id=$2',[user.id,input.id])).rows[0];
   if(input.action==='eat'&&previous){
    if(previous.undone_at||previous.product_id!==input.productId||Number(previous.portions)!==input.portions){await client.query('ROLLBACK');return authFailure('이미 사용한 기록 요청이에요. 목록을 다시 확인해 주세요.',409);}
    await client.query('COMMIT');return json({saved:true,replayed:true});
   }
   if(input.action==='undo'&&previous?.undone_at){await client.query('COMMIT');return json({saved:true,replayed:true});}
   if(input.action==='undo'&&!previous){await client.query('ROLLBACK');return authFailure('되돌릴 기록을 찾지 못했어요.',404);}
   const progress=result.rows[0],stock=parseStock(progress?.stock??{});
   if(!progress||progress.version!==input.version){await client.query('ROLLBACK');return authFailure('보유 수량이 변경됐어요. 새로 불러온 뒤 다시 눌러 주세요.',409);}
   if(!stock)throw new Error('Invalid stock');
   let next;
   if(input.action==='eat'){
    if(!product){await client.query('ROLLBACK');return authFailure('상품의 1회분 정보를 확인할 수 없어요.',422);}
    let consumed;try{consumed=consumeFood(stock,product,input.portions);}catch(e){await client.query('ROLLBACK');return authFailure(e instanceof Error?e.message:'보유 수량을 확인해 주세요.',422);}
    next=consumed.stock;
    await client.query('INSERT INTO food_intake_logs(user_id,id,product_id,product_name,portions,packs,calories,protein,stock_item,cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[user.id,input.id,product.id,product.name,input.portions,consumed.packs,consumed.calories,consumed.protein,JSON.stringify(stock[product.id]),Math.round(product.price/product.servings*input.portions)]);
   }else{
    try{next=restoreFood(stock,previous.stock_item,Number(previous.packs));}catch(e){await client.query('ROLLBACK');return authFailure(e instanceof Error?e.message:'수량을 확인해 주세요.',422);}
    await client.query('UPDATE food_intake_logs SET undone_at=NOW() WHERE user_id=$1 AND id=$2',[user.id,input.id]);
   }
   await client.query("UPDATE shopping_progress SET stock=$2,version=version+1,updated_at=NOW() WHERE user_id=$1 AND scope='products'",[user.id,JSON.stringify(next)]);
   await client.query('COMMIT');return json({saved:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch{return authFailure('저장 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.',503);}
}
