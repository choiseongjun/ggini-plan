import {quizRows,quizScore,quizVerdict} from '../../lib/taste-quiz';

/** A standalone typographic result card; no account data or remote assets. */
export async function createQuizCard(target:number,guess:number|null):Promise<Blob>{
 // A stalled web font must not leave the share button waiting forever.
 await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1200))]);
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const tokens=getComputedStyle(document.documentElement);
 const color=(name:string)=>tokens.getPropertyValue(name).trim();
 ctx.fillStyle=color('--surface');ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle=color('--primary');ctx.fillRect(0,0,1080,18);
 const text=(value:string,x:number,y:number,size:number,ink='--text',bold=false)=>{ctx.fillStyle=color(ink);ctx.font=`${bold?700:400} ${size}px sans-serif`;ctx.fillText(value,x,y);};
 text('끼니플랜  ·  내 입맛 맞혀봐',76,110,30,'--primary',true);
 text(guess===null?'너, 내 입맛 얼마나 알아?':`${quizScore(target,guess)} / 6 정답`,76,240,66,'--text',true);
 text(guess===null?'같이 먹은 짬바, 여섯 문제로 확인해요.':quizVerdict(quizScore(target,guess)),76,318,36,'--primary',true);
 const rows=quizRows(target),guesses=guess===null?null:quizRows(guess);
 rows.forEach((row,i)=>{
  const y=420+i*119;
  ctx.fillStyle=color('--surface-soft');ctx.fillRect(64,y-40,952,102);
  text(`${String(i+1).padStart(2,'0')}  ${row.scene}`,88,y,28,'--text-subtle');
  text(guesses?`${guesses[i].name===row.name?'정답':'엇갈림'} · 예상 ${guesses[i].name} / 실제 ${row.name}`:'내 선택은?  링크에서 맞혀봐요',88,y+42,31,'--text',true);
 });
 text(guess===null?'친구에게 링크를 보내 도전장을 내밀어요.':'이번엔 네 입맛도 맞혀볼게.',76,1220,34,'--primary',true);
 text('gginiplan.kr/taste',76,1290,28,'--text-subtle');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image unavailable')),'image/png'));
}
