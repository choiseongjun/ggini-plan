"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogItem } from "../lib/catalog";

export function ProductThumb({ item, className = "", zoomable = false }: { item: Pick<CatalogItem, "color" | "productImageUrl" | "productImageUrls" | "emoji" | "nutritionEstimate"> & { name?: string }; className?: string; zoomable?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const hasPhoto = item.productImageUrl && item.productImageUrl !== failedUrl;
  const gallery = (item.productImageUrls?.length ? item.productImageUrls : hasPhoto ? [item.productImageUrl!] : []);
  const canOpen = zoomable && gallery.length > 0;
  return <>
    <span
      className={`food-thumb ${item.color} ${className}`}
      style={{ ...(item.nutritionEstimate ? { position: "relative" } : undefined), ...(canOpen ? { cursor: "zoom-in" } : undefined) }}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      aria-label={canOpen ? "사진 더 보기" : undefined}
      onClick={canOpen ? () => setOpen(true) : undefined}
      onKeyDown={canOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } } : undefined}
    >
      {hasPhoto
        ? <Image src={item.productImageUrl!} alt="" width={56} height={56} unoptimized onError={() => setFailedUrl(item.productImageUrl)}/>
        : item.emoji}{item.nutritionEstimate&&<small style={{position:"absolute",bottom:0,left:0,right:0,background:"#fff2cc",color:"#654400",fontSize:10,textAlign:"center",lineHeight:"16px"}}>영양 추정</small>}
    </span>
    {open && gallery.length > 0 && <div
      role="dialog" aria-modal="true" aria-label={item.name ? `${item.name} 사진 모아보기` : "사진 모아보기"}
      style={{position:"fixed",inset:0,background:"rgba(20,20,20,0.72)",display:"grid",placeItems:"center",zIndex:1000,padding:20}}
      onClick={() => setOpen(false)}
    >
      <div
        style={{width:"fit-content",maxWidth:"92vw",maxHeight:"85vh",overflowY:"auto",background:"#fff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.35)"}}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"14px 16px",borderBottom:"1px solid #eee"}}>
          <strong style={{fontSize:14,color:"#26352b"}}>{item.name}</strong>
          <button type="button" aria-label="닫기" onClick={() => setOpen(false)} style={{width:28,height:28,borderRadius:"50%",border:"none",background:"#f0f1ec",color:"#444",fontSize:16,lineHeight:1,cursor:"pointer",flex:"none"}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8,padding:16,width:"min(380px, 92vw)"}}>
          {gallery.map((src, i) => <div key={src + i} style={{position:"relative",aspectRatio:"1",borderRadius:10,overflow:"hidden",background:"#f0f1ec"}}>
            <Image src={src} alt="" fill unoptimized style={{objectFit:"cover"}} sizes="130px"/>
          </div>)}
        </div>
      </div>
    </div>}
  </>;
}
