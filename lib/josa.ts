// 마지막 글자 받침에 맞는 조사: josa('된장국','이','가') → '된장국이'. 한글이 아니면 받침 없음으로 본다.
export function josa(word:string,withFinal:string,withoutFinal:string){
 const code=word.trim().charCodeAt(word.trim().length-1)-0xac00;
 const final=code>=0&&code<11172?code%28:0;
 // '으로'는 ㄹ 받침 뒤에서 '로'를 쓴다(달걀로, 서울로).
 if(withFinal==='으로'&&final===8)return word+withoutFinal;
 return word+(final!==0?withFinal:withoutFinal);
}
