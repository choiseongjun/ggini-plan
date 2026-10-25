'use client';
import {useEffect} from 'react';
import {clearRetiredFoodModel} from '../lib/retired-model-cleanup';

// Only remove the retired Food101 download. Meal drafts and login storage stay intact.
export function RetiredModelCleanup(){
 useEffect(()=>{
  if('caches' in window)void clearRetiredFoodModel(caches).catch(()=>{/* Cache access can be disabled by the browser. Retry on next visit. */});
 },[]);
 return null;
}
