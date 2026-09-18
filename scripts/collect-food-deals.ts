import {collectFoodDeals,CollectionBusy} from '../lib/food-deal-collector';
import {getPool} from '../lib/db';
async function main(){try{const limit=Number(process.env.FOOD_DEALS_LIMIT??2500);if(!Number.isSafeInteger(limit)||limit<1||limit>2500)throw new Error('수집 한도 설정 오류');console.log(JSON.stringify(await collectFoodDeals('daily',limit,38*60*1000)));}
catch(e){console.error(e instanceof Error?e.message:'수집 실패');if(!(e instanceof CollectionBusy))process.exitCode=1;}
finally{await getPool().end();}}
void main();
