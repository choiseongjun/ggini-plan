import {createHash,randomBytes} from 'node:crypto';
import {getPool} from './db';
import type {PublicUser} from './auth';
export const mobileSecretValid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const mobileHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function issueMobileCode(userId:string,challenge:string){
 if(!mobileSecretValid(challenge))throw new Error('Invalid challenge');
 const code=randomBytes(32).toString('hex');
 const db=await getPool().connect();
 try{
  await db.query('BEGIN');
  await db.query('DELETE FROM mobile_login_codes WHERE expires_at<=NOW() OR user_id=$1',[userId]);
  await db.query('INSERT INTO mobile_login_codes(code_hash,challenge,user_id) VALUES($1,$2,$3)',[mobileHash(code),challenge,userId]);
  await db.query('COMMIT');return code;
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
export async function consumeMobileCode(code:string,verifier:string):Promise<PublicUser|null>{
 if(!mobileSecretValid(code)||!mobileSecretValid(verifier))return null;
 const result=await getPool().query<PublicUser>(`WITH consumed AS (
 DELETE FROM mobile_login_codes WHERE code_hash=$1 AND challenge=$2 AND expires_at>NOW() RETURNING user_id
 ) SELECT u.id::text AS id,u.name,u.email FROM users u JOIN consumed c ON c.user_id=u.id`,[mobileHash(code),mobileHash(verifier)]);
 return result.rows[0]??null;
}
