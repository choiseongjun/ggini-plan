import {unstable_cache} from 'next/cache';
import {buildRecommendationCatalog,encodeRecommendationCatalog,decodeRecommendationCatalog,RECOMMENDATION_CATALOG_TAG} from './recommendation-catalog';

// This app has not enabled Cache Components; use the supported Data Cache API locally
// without changing caching/rendering semantics for the rest of the application.
const cachedCatalog=unstable_cache(async()=>encodeRecommendationCatalog(await buildRecommendationCatalog()),
 // Rebuild old cached records that still contained the placeholder 15 minutes.
 ['recommendation-catalog-v3',process.env.VERCEL_GIT_COMMIT_SHA??'local'],
 {revalidate:600,tags:[RECOMMENDATION_CATALOG_TAG]});

let pending:ReturnType<typeof readCatalog>|null=null;
async function readCatalog(){return decodeRecommendationCatalog(await cachedCatalog());}
export async function cachedRecommendationProducts(){
 if(pending)return pending;
 const request=readCatalog();pending=request;
 try{return await request;}finally{if(pending===request)pending=null;}
}
