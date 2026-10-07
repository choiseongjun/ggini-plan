import {unstable_cache} from 'next/cache';
import {withMarketPrices} from './regional-prices-db';
import {buildRecommendationCatalog,encodeRecommendationCatalog,decodeRecommendationCatalog,RECOMMENDATION_CATALOG_TAG} from './recommendation-catalog';

// This app has not enabled Cache Components; use the supported Data Cache API locally
// without changing caching/rendering semantics for the rest of the application.
const cachedCatalog=unstable_cache(async()=>encodeRecommendationCatalog(await buildRecommendationCatalog()),
 // Rebuild old cached records that still contained the placeholder 15 minutes.
 ['recommendation-catalog-v3',process.env.VERCEL_GIT_COMMIT_SHA??'local'],
 {revalidate:600,tags:[RECOMMENDATION_CATALOG_TAG]});

let pending:ReturnType<typeof readCatalog>|null=null;
// 재료비는 캐시 밖에서 매번 최신 시세로 다시 매긴다(시세 스냅숏은 5분 캐시).
async function readCatalog(){return withMarketPrices(decodeRecommendationCatalog(await cachedCatalog()));}
export async function cachedRecommendationProducts(){
 if(pending)return pending;
 const request=readCatalog();pending=request;
 try{return await request;}finally{if(pending===request)pending=null;}
}
