// Keep only the latest decoded payload. A changed shared-cache value takes effect immediately.
export function decodedValueCache<T>(decode:(encoded:string)=>T){
 let previous:string|undefined,value:T;
 return (encoded:string):T=>{
  if(encoded!==previous){const next=decode(encoded);value=next;previous=encoded;}
  return value;
 };
}
