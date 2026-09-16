"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import styles from "./checkbox.module.css";

type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

/** Use inside a label (or with id/htmlFor). Native input preserves form and keyboard behavior. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...props }, ref) {
  return <span className={styles.control}>
    <input {...props} ref={ref} type="checkbox" className={[styles.input, className].filter(Boolean).join(" ")}/>
    <span className={styles.mark} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6.5 12 3.7 3.8 7.3-7.6"/></svg></span>
  </span>;
});
