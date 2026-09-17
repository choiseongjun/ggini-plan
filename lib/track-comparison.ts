'use client';
export function trackComparison(productId:string) {
  void fetch('/api/comparison-interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId}),keepalive:true}).catch(()=>{});
}
