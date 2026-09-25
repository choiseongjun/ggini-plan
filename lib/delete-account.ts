import {createClient} from '@supabase/supabase-js';
import {getPool} from './db';
import {isStoredImage} from './catalog-storage';
import {invalidateCatalogCache} from './catalog-db';

export async function deleteAccount(userId:string,deleteIdentity:()=>Promise<void>){
 const db=await getPool().connect();
 try{
  await db.query('BEGIN');
  const user=(await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
  if(!user)throw new Error('계정을 찾을 수 없어요.');
  const community=(await db.query('SELECT photo_path FROM community_posts WHERE user_id=$1 AND photo_path IS NOT NULL',[userId])).rows;
  const submissions=(await db.query('SELECT photo_path,catalog_id FROM submissions WHERE user_id=$1 FOR UPDATE',[userId])).rows;
  const catalogIds=submissions.map(row=>row.catalog_id).filter(Boolean);
  const catalog=(await db.query('SELECT product_image_url FROM catalog_items WHERE id=ANY($1::text[]) FOR UPDATE',[catalogIds])).rows;
  const tasks:{bucket:string;paths:string[]}[]=[
   {bucket:'ggini-community',paths:community.map(row=>row.photo_path)},
   {bucket:'ggini-submissions',paths:submissions.map(row=>row.photo_path).filter(Boolean)},
  ];
  const publicBucket=process.env.SUPABASE_STORAGE_BUCKET||'ggini-plan';
  const prefix=`${process.env.SUPABASE_URL?.replace(/\/$/,'')}/storage/v1/object/public/${publicBucket}/`;
  const publicPaths:string[]=[];
  for(const row of catalog){
   const url=row.product_image_url;
   if(typeof url!=='string'||!isStoredImage(url))continue;
   const shared=(await db.query('SELECT 1 FROM catalog_items WHERE (product_image_url=$1 OR nutrition_photo_url=$1) AND NOT(id=ANY($2::text[])) LIMIT 1',[url,catalogIds])).rowCount;
   if(!shared)publicPaths.push(url.slice(prefix.length));
  }
  tasks.push({bucket:publicBucket,paths:publicPaths});
  if(tasks.some(task=>task.paths.length)){
   const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
   if(!key||!process.env.SUPABASE_URL)throw new Error('사진 삭제 설정을 확인해야 합니다. 문의해 주세요.');
   const storage=createClient(process.env.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
   for(const task of tasks){
    for(let i=0;i<task.paths.length;i+=100){
     const result=await storage.from(task.bucket).remove([...new Set(task.paths.slice(i,i+100))]);
     if(result.error)throw new Error('사진 삭제가 완료되지 않았어요. 다시 시도해 주세요.');
    }
   }
  }
  await deleteIdentity();
  await db.query('UPDATE catalog_items SET product_image_url=NULL WHERE id=ANY($1::text[])',[catalogIds]);
  await db.query('DELETE FROM users WHERE id=$1',[userId]);
  await db.query('COMMIT');
  invalidateCatalogCache();
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
