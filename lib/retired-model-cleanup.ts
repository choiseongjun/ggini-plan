export async function clearRetiredFoodModel(storage:CacheStorage){
 if(!(await storage.has('transformers-cache')))return;
 const cache=await storage.open('transformers-cache');
 for(const request of await cache.keys()){
  const url=new URL(request.url);
  if(url.hostname==='huggingface.co'&&url.pathname.startsWith('/onnx-community/swin-finetuned-food101-ONNX/'))await cache.delete(request);
 }
}
