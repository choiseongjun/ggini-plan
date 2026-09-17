import fs from 'node:fs';
import {planProducts} from '../lib/shopping-plan-catalog';
import {getPool} from '../lib/db';
try{const products=await planProducts();fs.mkdirSync('toss/public',{recursive:true});fs.writeFileSync('toss/public/catalog.json',JSON.stringify({exportedAt:new Date().toISOString(),products}));console.log(`Exported ${products.length} public products`);}finally{await getPool().end();}
