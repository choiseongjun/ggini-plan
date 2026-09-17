import {readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';
const targets=[
 {baseId:'rice',no:5050162,grams:1680,unit:'g',quantity:1680,evidence:'name',match:'210g (8입)'},
 {baseId:'rice',no:1000832403,grams:1200,unit:'g',quantity:1200,evidence:'volume',match:'200g*6개'},
 {baseId:'tofu',no:5118044,grams:500,unit:'g',quantity:500,evidence:'volume',match:'500g'},
 {baseId:'tofu',no:1001986025,grams:300,unit:'g',quantity:300,evidence:'volume',match:'300g'},
 {baseId:'eggs',no:5119904,grams:0,unit:'개',quantity:10,evidence:'salesUnit',match:'1팩(10구)'},
 {baseId:'eggs',no:5056790,grams:0,unit:'개',quantity:10,evidence:'salesUnit',match:'1팩(10구)'},
 {baseId:'chicken',no:5006227,grams:600,unit:'g',quantity:600,evidence:'volume',match:'600g'},
];
const root=new URL('../data/',import.meta.url),evidenceFile=new URL('cooking-alternative-evidence.json',root);
const notes={rice:'조리된 현미밥끼리 비교해요. 밥 종류와 개별 포장량이 달라질 수 있어요.',tofu:'일반 두부끼리 비교해요. 콩 원산지·유기농 여부와 식감은 상품마다 달라요.',eggs:'생달걀 개수 기준으로 비교해요. 대란·특란의 크기가 달라 중량과 영양은 같지 않아요.',chicken:'가열된 닭가슴살끼리 비교해요. 간과 영양이 다를 수 있으니 상품 안내를 확인해 주세요.'};
if(process.argv.includes('--collect')){
 const rows=[];
 for(const target of targets){
  const sourceUrl=`https://www.kurly.com/goods/${target.no}`;
  const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const html=await response.text(),m=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!m)throw new Error('Missing product data');
  const p=JSON.parse(m[1]).props.pageProps.product,o=p.dealProducts?.[0];
  if(p.no!==target.no||p.isSoldOut||!p.isPurchaseStatus||p.isMultiplePrice||p.dealProducts?.length!==1||o.isSoldOut||!o.isPurchaseStatus||o.minEa>1||p.minEa>1||!String(p[target.evidence]).includes(target.match))throw new Error(`Ambiguous product ${target.no}`);
  const price=o.discountedPrice??o.basePrice;if(!Number.isSafeInteger(price)||price<=0)throw new Error('Invalid price');
  rows.push({...target,name:p.name,price,sourceUrl,volume:p.volume,salesUnit:p.salesUnit,imageUrl:p.mainImageUrl,allergyText:p.allergy??'',checkedAt:new Date().toISOString()});
 }
 await writeFile(evidenceFile,JSON.stringify({source:'Kurly public product pages',rows},null,2)+'\n');console.log(JSON.stringify(rows.map(r=>({name:r.name,price:r.price,volume:r.volume}))));
}else if(process.argv.includes('--apply')){
 const {rows}=JSON.parse(await readFile(evidenceFile,'utf8'));
 if(rows.length!==targets.length||rows.some((r,i)=>r.no!==targets[i].no||r.grams!==targets[i].grams||r.quantity!==targets[i].quantity||r.sourceUrl!==`https://www.kurly.com/goods/${r.no}`))throw new Error('Evidence does not match reviewed targets');
 const data=JSON.parse(await readFile(new URL('cooking-ingredient-alternatives.json',root),'utf8'));
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}),c=await pool.connect();let inserted=0;
 try{
  await c.query('BEGIN');await c.query('LOCK TABLE catalog_items IN SHARE ROW EXCLUSIVE MODE');
  for(const row of rows){
   let saved=(await c.query('SELECT id,name,detail,unit,quantity,product_url FROM catalog_items WHERE product_url=$1',[row.sourceUrl])).rows[0];
   if(!saved){
    const allergy={status:'unknown',statement:row.allergyText,sourceUrl:row.sourceUrl,evidenceUrls:[],note:'공개 판매 정보 확인. 전체 원재료 표시 검수 전.',crossContactNote:'포장지 확인 필요'};
    const values=[`kurly-${row.no}`,row.name,`${row.quantity}${row.unit} · 판매 1묶음`,row.price,row.quantity,row.unit,row.sourceUrl,row.imageUrl,row.checkedAt,JSON.stringify(allergy)];
    await c.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,unit,category,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info) VALUES($1,$2,$3,$4,'1묶음',$5,$6,'ingredient','🧺','mint',$2,$7,$8,$9,'컬리 공개 단일 구성 가격 · 쿠폰·배송비 별도',FALSE,'{}',$10::jsonb)`,values);inserted++;
    saved={id:values[0],name:row.name,detail:values[2],unit:row.unit,quantity:row.quantity,product_url:row.sourceUrl};
   }
   if(saved.name!==row.name||saved.unit!==row.unit||Number(saved.quantity)!==row.quantity)throw new Error(`Existing catalog differs: ${row.no}`);
   let group=data.groups.find(g=>g.baseId===row.baseId);if(!group){group={baseId:row.baseId,note:notes[row.baseId],offers:[]};data.groups.push(group);}
   const offer={id:saved.id,name:saved.name,detail:saved.detail,unit:saved.unit,quantity:Number(saved.quantity),grams:row.grams,sourceUrl:row.sourceUrl};
   group.offers=group.offers.filter(o=>o.id!==offer.id);group.offers.push(offer);
  }
  await c.query('COMMIT');await writeFile(new URL('cooking-ingredient-alternatives.json',root),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({inserted,groups:data.groups.map(g=>({base:g.baseId,alternatives:g.offers.length}))}));
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}
}else throw new Error('Use --collect or --apply');
