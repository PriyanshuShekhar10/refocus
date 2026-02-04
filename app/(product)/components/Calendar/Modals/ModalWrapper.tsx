"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ANIMATION_DURATION_MS = 200;

interface ModalWrapperProps {
  children: ReactNode;
  onClose: () => void;
  /** If true, clicking the backdrop or pressing Escape will close. Default true. */
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export function ModalWrapper({
  children,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalWrapperProps) {
  const [isExiting, setIsExiting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const exitingRef = useRef(false);
  const handleClose = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setIsExiting(true);
    setTimeout(() => onClose(), ANIMATION_DURATION_MS);
  }, [onClose]);

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOnEscape, handleClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!closeOnBackdrop || isExiting) return;
    if (contentRef.current && contentRef.current.contains(e.target as Node)) return;
    handleClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 modal-backdrop ${
        isExiting ? "modal-backdrop-exit" : "modal-backdrop-enter"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={contentRef}
        className={`w-full max-w-md modal-content ${isExiting ? "modal-content-exit" : "modal-content-enter"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
