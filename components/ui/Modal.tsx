"use client";

import type { ReactNode } from "react";

export default function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] rounded-[20px] bg-white p-6 shadow-[0_20px_50px_rgba(42,32,28,.2)]"
        style={{ animation: "ccPop .2s ease" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted-2 transition-colors hover:bg-input hover:text-charcoal"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
