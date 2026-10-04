'use client';
import {useRef,useState} from 'react';
import {canonicalIngredient} from '../lib/ingredient-canonical';
import {Icon} from './app-shell';
import type {PhotoIngredient,PhotoSource} from '../lib/pantry-photo';
// Keep the selected local file while the parent temporarily shows the login screen.
let pendingPhoto:File|null=null;
export const hasPendingPantryPhoto=()=>pendingPhoto!==null;

export function PantryPhotoInput({onConfirm,disabled,userId,onLogin,onBusyChange}:{onConfirm:(names:string[],source:PhotoSource)=>void;disabled:boolean;userId?:string;onLogin:()=>void;onBusyChange?:(busy:boolean)=>void}){
 const [planned,setPlanned]=useState(false),[ownershipConfirmed,setOwnershipConfirmed]=useState(false);
 const [file,setFile]=useState<File|null>(()=>pendingPhoto),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [items,setItems]=useState<(PhotoIngredient & {selected:boolean})[]>([]),[note,setNote]=useState(''),[review,setReview]=useState(false);
 const [dragging,setDragging]=useState(false);
 const fileInput=useRef<HTMLInputElement>(null);
 function selectFiles(files:FileList|null){
  if(busy||disabled||!files?.length)return;
  setDragging(false);setReview(false);setError('');setItems([]);setFile(null);pendingPhoto=null;
  if(files.length!==1){setError('사진은 한 번에 한 장씩 넣어주세요.');return;}
  const next=files[0];
  if(!['image/jpeg','image/png','image/webp'].includes(next.type)&&!(next.type===''&&/\.(jpe?g|png|webp)$/i.test(next.name))){setError('JPG·PNG·WEBP 사진을 넣어주세요.');return;}
  if(next.size===0||next.size>8*1024*1024){setError('사진은 8MB 이하로 선택해 주세요.');return;}
  setFile(next);pendingPhoto=next;
 }
 async function analyze(){
  if(!userId){onLogin();return;}
  if(!file)return;setBusy(true);onBusyChange?.(true);setError('');setReview(false);setItems([]);
  try{const form=new FormData();form.set('photo',file);
   const response=await fetch('/api/pantry/photo',{method:'POST',body:form});const data=await response.json();
   if(response.status===401){onLogin();return;}
   if(!response.ok)throw new Error(data.error??'사진을 읽지 못했어요.');
   setItems(data.items.map((item:PhotoIngredient)=>({...item,selected:!item.uncertain})));setPlanned(data.source==='cart');setOwnershipConfirmed(data.source!=='unknown'&&data.source!=='cart');setNote(data.note);setReview(true);
  }catch(e){setError(e instanceof Error?e.message:'사진을 읽지 못했어요.');}finally{setBusy(false);onBusyChange?.(false);}
 }
 return <section className="pantry-photo-input" aria-busy={busy}>
  <div className={`pantry-photo-drop${dragging&&!busy&&!disabled?' is-dragging':''}`} onDragEnter={e=>{e.preventDefault();if(!busy&&!disabled)setDragging(true);}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=busy||disabled?'none':'copy';}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);selectFiles(e.dataTransfer.files);}}>
   <button className="pantry-photo-select" type="button" disabled={busy||disabled} onClick={()=>fileInput.current?.click()}><span className="pantry-upload-icon"><Icon name="bag" size={23}/></span><span><strong>{dragging&&!busy&&!disabled?'여기에 사진을 놓아주세요':file?'다른 사진 선택':'사진 한 장으로 재료 추가'}</strong><small>영수증·재료·장바구니 사진 선택 또는 끌어놓기</small></span><span className="pantry-upload-plus" aria-hidden="true">+</span></button>
   <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="재료 사진 선택" hidden disabled={busy||disabled} onChange={e=>{selectFiles(e.target.files);e.target.value='';}}/>
  </div>
  {file&&<p className="pantry-photo-selected" role="status">선택한 사진: {file.name}<button type="button" disabled={busy||disabled} onClick={()=>{pendingPhoto=null;setFile(null);setReview(false);setItems([]);setError('');}}>삭제</button></p>}
  {file&&<><small>JPG·PNG·WEBP, 최대 8MB · 사진은 재료 인식을 위해 OpenAI로 전송됩니다. 영수증 개인정보는 가리고 올려주세요.</small><button className="pantry-primary" type="button" disabled={busy||disabled} onClick={analyze}>{busy?'사진에서 재료를 찾고 있어요…':userId?'이 사진에서 재료 찾기':'로그인하고 사진에서 재료 찾기'}</button></>}
  {!file&&!userId&&<small className="pantry-photo-login-note">사진 인식은 로그인 후 · 직접 입력은 바로 이용</small>}
  {error&&<p role="alert" className="pantry-error">{error}</p>}
  {review&&<div><h3>찾은 재료를 한 번에 확인해 주세요</h3><p className="pantry-muted">저장할 재료만 골라주세요. 틀린 이름은 고칠 수 있고, 수량과 날짜는 입력하지 않아도 돼요.</p>{note&&<p>{note}</p>}
   {items.length>0&&(planned||!ownershipConfirmed)&&<fieldset className="pantry-ownership"><legend>{planned?'장바구니에서 찾았어요. 이미 구매했나요?':'지금 가지고 있는 재료인가요?'}</legend><label><input type="radio" name="pantry-ownership" checked={ownershipConfirmed&&!planned} onChange={()=>{setPlanned(false);setOwnershipConfirmed(true);}}/>가지고 있어요</label><label><input type="radio" name="pantry-ownership" checked={ownershipConfirmed&&planned} onChange={()=>{setPlanned(true);setOwnershipConfirmed(true);}}/>구매 예정이에요</label></fieldset>}
   {items.length>0&&ownershipConfirmed&&!planned&&<details><summary>아직 구매하지 않은 재료인가요?</summary><button type="button" onClick={()=>setPlanned(true)}>구매 예정으로 변경</button></details>}
   {!items.length&&<p>찾은 재료가 없어요. 선명한 사진으로 다시 시도하거나 아래에서 직접 추가해 주세요.</p>}
   {items.map((item,index)=><div className="pantry-photo-row" key={index}><input type="checkbox" aria-label={`${item.name} 추가 선택`} checked={item.selected} onChange={e=>setItems(previous=>previous.map((v,i)=>i===index?{...v,selected:e.target.checked}:v))}/><input aria-label={`인식 재료 ${index+1} 이름`} maxLength={50} value={item.name} onChange={e=>setItems(previous=>previous.map((v,i)=>i===index?{...v,name:e.target.value}:v))}/><small>{item.category}{item.uncertain?' · 확인 필요':''}</small></div>)}
   <button type="button" disabled={disabled||!ownershipConfirmed||!items.some(i=>i.selected&&canonicalIngredient(i.name))} onClick={()=>{pendingPhoto=null;setFile(null);onConfirm([...new Set(items.filter(i=>i.selected).map(i=>canonicalIngredient(i.name)).filter(Boolean))],planned?'cart':'ingredients');setReview(false);setItems([]);}}>{planned?'구매 예정으로 담기':'내 주방에 추가'}</button>
  </div>}
 </section>;
}
