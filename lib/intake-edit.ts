import {validPortions} from './food-intake';

// Keep the recorded nutrition basis and unknown values when correcting a portion.
export function rescaleIntake(value:number|string|null,previous:number,next:number){
 if(!validPortions(previous)||!validPortions(next))throw new Error('먹은 양을 확인해 주세요.');
 if(value===null)return null;
 const n=Number(value);
 if(!Number.isFinite(n))throw new Error('기록의 영양정보를 확인해 주세요.');
 return Math.round(n/previous*next*1000)/1000;
}
