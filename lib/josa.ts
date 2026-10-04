// 마지막 글자 받침에 맞는 조사: josa('된장국','이','가') → '된장국이'. 한글이 아니면 받침 없음으로 본다.
export function josa(word:string,withFinal:string,withoutFinal:string){
 const code=word.trim().charCodeAt(word.trim().length-1)-0xac00;
 return word+(code>=0&&code<11172&&code%28!==0?withFinal:withoutFinal);
}
