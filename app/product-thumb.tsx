"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogItem } from "../lib/catalog";

export function ProductThumb({ item, className = "" }: { item: Pick<CatalogItem, "color" | "productImageUrl" | "emoji" | "nutritionEstimate">; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className={`food-thumb ${item.color} ${className}`} style={item.nutritionEstimate?{position:"relative"}:undefined}>
    {item.productImageUrl && item.productImageUrl !== failedUrl
      ? <Image src={item.productImageUrl} alt="" width={56} height={56} unoptimized onError={() => setFailedUrl(item.productImageUrl)}/>
      : item.emoji}{item.nutritionEstimate&&<small style={{position:"absolute",bottom:0,left:0,right:0,background:"#fff2cc",color:"#654400",fontSize:10,textAlign:"center",lineHeight:"16px"}}>영양 추정</small>}
  </span>;
}
