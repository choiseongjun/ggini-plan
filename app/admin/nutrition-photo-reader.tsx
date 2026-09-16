"use client";

import { useRef, useState, type PointerEvent } from "react";
import "./nutrition-photo-reader.css";

type Point = { x: number; y: number };

export function NutritionPhotoReader({ src, disabled, onRead }: {
  src: string; disabled: boolean; onRead: (file: File) => Promise<void>;
}) {
  const image = useRef<HTMLImageElement>(null);
  const anchor = useRef<Point | null>(null);
  const [region, setRegion] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function point(event: PointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  }
  async function read() {
    const element = image.current;
    if (!element?.naturalWidth || region.width < 1 || region.height < 1) {
      setError("표 전체가 포함되도록 영역을 선택해 주세요."); return;
    }
    setBusy(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      const width = element.naturalWidth * region.width / 100;
      const height = element.naturalHeight * region.height / 100;
      const scale = Math.min(1, 2800 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("사진 영역을 처리하지 못했습니다.");
      context.drawImage(element, element.naturalWidth * region.x / 100, element.naturalHeight * region.y / 100, width, height, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("사진 영역을 처리하지 못했습니다.");
      await onRead(new File([blob], "nutrition-region.png", { type: "image/png" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "영역을 읽지 못했습니다."); }
    finally { setBusy(false); }
  }
  return <div className="nutrition-photo-reader">
    <p>사진에서 영양표 하나를 드래그해 선택한 뒤 다시 읽으세요. 기준량과 열량도 포함해 주세요. 원본 사진은 그대로 저장됩니다.</p>
    <div className="nutrition-crop" onPointerDown={event => {
      if (disabled || busy) return;
      anchor.current = point(event); event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => {
      if (!anchor.current) return;
      const end = point(event), start = anchor.current;
      setRegion({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) });
    }} onPointerUp={() => { anchor.current = null; }} onPointerCancel={() => { anchor.current = null; }}>
      {/* Natural image dimensions are needed for the OCR crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} src={src} alt="드래그해서 읽을 영양표 영역 선택" draggable={false}/>
      <div className="nutrition-crop-region" style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}/>
    </div>
    <details><summary>선택 영역 숫자로 조정 (%)</summary><div className="nutrition-crop-fields">{([['x', '왼쪽'], ['y', '위쪽'], ['width', '너비'], ['height', '높이']] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min={0} max={100} step={1} value={Math.round(region[key])} disabled={disabled || busy} onChange={event => {
      const next = { ...region, [key]: Math.max(0, Math.min(100, Number(event.target.value))) };
      next.width = Math.min(next.width, 100 - next.x); next.height = Math.min(next.height, 100 - next.y); setRegion(next);
    }}/></label>)}</div></details>
    <div className="nutrition-crop-actions"><button type="button" disabled={disabled || busy} onClick={() => void read()}>선택한 영역 다시 읽기</button><button type="button" disabled={disabled || busy} onClick={() => setRegion({ x: 0, y: 0, width: 100, height: 100 })}>전체 영역 선택</button></div>
    <small>밀키트의 면·소스 등 구성품별 표는 상품 전체 영양값이 아닙니다. 여러 표를 합쳐 자동 입력하지 마세요.</small>
    {error && <p role="alert">{error}</p>}
  </div>;
}
