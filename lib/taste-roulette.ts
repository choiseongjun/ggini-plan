export function rouletteCandidates(count:number,previous:number|null){
 return Array.from({length:count},(_,i)=>i).filter(i=>count===1||i!==previous);
}
export function rouletteRotation(from:number,index:number,count:number,jitter:number){
 const step=360/count;
 const landing=((360-(index+.5)*step+jitter*step*.55)%360+360)%360;
 return from+360*6+((landing-from%360+360)%360);
}
