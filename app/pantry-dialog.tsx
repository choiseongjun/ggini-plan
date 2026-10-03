'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {Icon} from './app-shell';

export function PantryDialog({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('[data-autofocus]')?.focus();
    return () => {element?.close(); previousFocus?.focus({preventScroll: true});};
  }, []);
  return <dialog ref={dialog} className="pantry-dialog" aria-labelledby="pantry-dialog-title" onCancel={event => {event.preventDefault(); onClose();}}>
    <header className="pantry-dialog-heading"><h2 id="pantry-dialog-title">{title}</h2><button type="button" className="pantry-icon-button" aria-label="닫기" onClick={onClose}><Icon name="close"/></button></header>
    {children}
  </dialog>;
}
