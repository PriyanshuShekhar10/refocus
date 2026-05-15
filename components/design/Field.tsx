"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./design.module.css";

type FieldShellProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  ok?: ReactNode;
  trailing?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  hint,
  error,
  ok,
  trailing,
  htmlFor,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      {(label || trailing) && (
        <div className={styles.fieldRow}>
          {label && (
            <label className={styles.fieldLabel} htmlFor={htmlFor}>
              {label}
            </label>
          )}
          {trailing}
        </div>
      )}
      {children}
      {error ? (
        <p className={styles.fieldErr}>{error}</p>
      ) : ok ? (
        <p className={styles.fieldOk}>{ok}</p>
      ) : hint ? (
        <p className={styles.fieldHint}>{hint}</p>
      ) : null}
    </div>
  );
}

type DInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  leading?: ReactNode;
};

export const DInput = forwardRef<HTMLInputElement, DInputProps>(function DInput(
  { leading, className, ...rest },
  ref
) {
  const inputClasses = [styles.input, className].filter(Boolean).join(" ");
  if (leading) {
    return (
      <div className={styles.inputPrefix}>
        <span className={styles.inputPrefixIcon}>{leading}</span>
        <input ref={ref} className={inputClasses} {...rest} />
      </div>
    );
  }
  return <input ref={ref} className={inputClasses} {...rest} />;
});

export const DTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function DTextarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={[styles.textarea, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
});

type DPasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const DPasswordInput = forwardRef<HTMLInputElement, DPasswordInputProps>(
  function DPasswordInput({ className, ...rest }, ref) {
    const [show, setShow] = useState(false);
    const reactId = useId();
    const inputId = rest.id ?? reactId;
    return (
      <div className={styles.inputPrefix} style={{ position: "relative" }}>
        <input
          ref={ref}
          id={inputId}
          type={show ? "text" : "password"}
          className={[styles.input, className].filter(Boolean).join(" ")}
          style={{ paddingRight: 40 }}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className={styles.inputSuffixBtn}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }
);
