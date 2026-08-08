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
        className="w-full max-w-[420px] rounded-[20px] bg-white p-6 shadow-[0_20px_50px_rgba(42,32,28,.2)]"
        style={{ animation: "ccPop .2s ease" }}
      >
        {children}
      </div>
    </div>
  );
}
