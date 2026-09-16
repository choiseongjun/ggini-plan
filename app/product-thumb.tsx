"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogItem } from "../lib/catalog";

export function ProductThumb({ item, className = "" }: { item: CatalogItem; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <span className={`food-thumb ${item.color} ${className}`}>
    {item.productImageUrl && item.productImageUrl !== failedUrl
      ? <Image src={item.productImageUrl} alt="" width={56} height={56} unoptimized onError={() => setFailedUrl(item.productImageUrl)}/>
      : item.emoji}
  </span>;
}
