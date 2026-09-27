'use client';
import {useState} from 'react';

export function DiaryPhotoImage({src,alt,uniform=false}:{src:string;alt:string;uniform?:boolean}){
 const [width,setWidth]=useState<number>();
 // Single photos retain their native size; uniform galleries fill equal tiles.
 // eslint-disable-next-line @next/next/no-img-element -- private authenticated photo; preserve its intrinsic resolution
 return <img src={src} alt={alt} loading="lazy" decoding="async" style={{maxWidth:uniform?'100%':width??'100%'}} onLoad={event=>setWidth(event.currentTarget.naturalWidth)}/>;
}
