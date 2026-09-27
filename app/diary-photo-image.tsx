'use client';
import {useState} from 'react';

export function DiaryPhotoImage({src,alt}:{src:string;alt:string}){
 const [width,setWidth]=useState<number>();
 // Keep small legacy thumbnails at their native size instead of stretching them.
 // eslint-disable-next-line @next/next/no-img-element -- private authenticated photo; preserve its intrinsic resolution
 return <img src={src} alt={alt} loading="lazy" decoding="async" style={{maxWidth:width??'100%'}} onLoad={event=>setWidth(event.currentTarget.naturalWidth)}/>;
}
