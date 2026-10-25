export function accountLabel(email:string){return /^kakao-\d+@kakao\.local\.invalid$/.test(email)?'카카오 계정':email;}
