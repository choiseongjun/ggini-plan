import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const alt='너, 내 입맛 얼마나 알아? 친구가 보낸 여섯 문제 | 끼니플랜';
export const size={width:1200,height:630};
export const contentType='image/png';
// ImageResponse cannot resolve CSS variables; use the existing design token values.
const palette={surface:'#fffdf7',soft:'#edf2e5',primary:'#526c47',text:'#33402c'};
export default async function Image(){
 const font=await readFile(join(process.cwd(),'public/fonts/Jua-Regular.ttf'));
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:palette.soft,color:palette.text,padding:64,fontFamily:'Jua',flexDirection:'column',justifyContent:'space-between'}}>
  <div style={{display:'flex',fontSize:30,color:palette.primary}}>끼니플랜 · 같이 먹은 짬바 테스트</div>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',flexDirection:'column',fontSize:82,lineHeight:1.2}}><span>너, 내 입맛</span><span style={{color:palette.primary}}>얼마나 알아?</span></div><div style={{display:'flex',background:palette.surface,borderRadius:36,width:240,height:240,alignItems:'center',justifyContent:'center',fontSize:80,whiteSpace:'nowrap',color:palette.primary}}>？ / 6</div></div>
  <div style={{display:'flex',fontSize:34}}>우리 그렇게 같이 먹었는데, 6개 다 맞힐 수 있어?</div>
 </div>,{...size,fonts:[{name:'Jua',data:font,weight:400,style:'normal'}]});
}
