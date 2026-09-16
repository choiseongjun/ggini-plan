"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { RiceBuddy } from './rice-buddy';
import styles from './app-loading.module.css';

type Register = (message: string) => () => void;
const LoadingContext = createContext<Register | null>(null);

export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<Map<symbol, string>>(() => new Map());
  const register = useCallback<Register>((message) => {
    const id = Symbol();
    setRequests(current => new Map(current).set(id, message));
    return () => setRequests(current => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);
  const messages = [...requests.values()];
  return <LoadingContext.Provider value={register}>
    {children}
    {messages.length > 0 && <LoadingToast message={messages[messages.length - 1]}/>}
  </LoadingContext.Provider>;
}

function LoadingToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className={styles.position}>
    <section className={styles.card}>
      <div className={styles.buddy} aria-hidden="true"><RiceBuddy/><span>✦</span></div>
      <div className={styles.content}>
        <div role="status" aria-live="polite" aria-atomic="true"><strong>{message}</strong><p>끼니가 부지런히 준비하고 있어요<span aria-hidden="true"> · · ·</span></p></div>
        <div className={styles.track} role="progressbar" aria-label={message}><span/></div>
      </div>
    </section>
  </div>;
}

/** Mount while an operation is pending; unmounting always releases its loading state. */
export function AppLoading({ message = '잠시만 기다려 주세요' }: { message?: string }) {
  const register = useContext(LoadingContext);
  useEffect(() => register?.(message), [register, message]);
  return null;
}

export function useLoadingTask(): Register {
  const register = useContext(LoadingContext);
  if (!register) throw new Error('AppLoadingProvider is required');
  return register;
}
