import pg from "pg";
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
// Public seller listings checked 2026-09-16. Never replace administrator edits.
const rows=[
 ["rice","햇반 발아현미밥","210g × 1개",2062,"1개",210,"https://www.cjthemarket.com/the/product/product-main?prdCd=40119245","g","🍚","sand","판매 페이지 1개 옵션 · 배송비 별도",[]],
 ["banana","[KF365] 실속 바나나","1kg 내외 · 원산지 선택",3690,"1송이",1000,"https://www.kurly.com/goods/1001872242","g","🍌","butter","표시 시작가 · 옵션별 가격 상이 · 배송비 별도",[]],
 ["tofu","[Kurly’s] 국산콩 두부","300g × 1팩",2200,"1팩",300,"https://www.kurly.com/goods/5053329","g","◻️","mint","판매 페이지 표시가 · 배송비 별도",["soy"]],
 ["eggs","[KF365] 무항생제 달걀 L(대란)","20구 · 1팩",7700,"20개",20,"https://www.kurly.com/goods/1000179412","개","🥚","cream","판매 페이지 표시가 · 배송비 별도",["egg"]],
 ["chicken","[모두의식단] 냉장 닭가슴살","100g · 맛/수량 선택",2090,"1팩 기준",100,"https://www.kurly.com/goods/1001384157","g","🍗","peach","100g 표시 시작가 · 옵션별 가격 상이 · 배송비 별도",["chicken","soy","milk"]]
];
try{for(const [id,name,detail,price,portions,quantity,url,unit,emoji,color,note,allergens] of rows){
 await pool.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,search_query,product_url,unit,emoji,color,price_note,price_checked_at,allergens)
 VALUES($1,$2,$3,$4,$5,$6,$2,$7,$8,$9,$10,$11,NOW(),$12)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,detail=EXCLUDED.detail,price=EXCLUDED.price,portions=EXCLUDED.portions,
 quantity=EXCLUDED.quantity,search_query=EXCLUDED.search_query,product_url=EXCLUDED.product_url,unit=EXCLUDED.unit,emoji=EXCLUDED.emoji,color=EXCLUDED.color,
 price_note=EXCLUDED.price_note,price_checked_at=EXCLUDED.price_checked_at,allergens=EXCLUDED.allergens,updated_at=NOW()
 WHERE catalog_items.updated_by IS NULL AND catalog_items.price_checked_at IS NULL`,[id,name,detail,price,portions,quantity,url,unit,emoji,color,note,allergens]);
}
await pool.query(`UPDATE catalog_items SET protein_g=20,nutrition_basis='100g당',nutrition_source_name='컬리 상품 상세 · 1개당 단백질 20g',nutrition_source_url=product_url WHERE id='chicken' AND updated_by IS NULL AND protein_g IS NULL`);
await pool.query(`UPDATE catalog_items SET allergens=ARRAY['egg','soy','wheat','chicken'] WHERE id='meal-kit-kimchi-stew' AND updated_by IS NULL`);
console.log("Verified seller catalog ready (administrator edits preserved).");}finally{await pool.end();}
