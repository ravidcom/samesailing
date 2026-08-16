"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function BoardActions({ sailingId }: { sailingId: string }) {
  const { mySailings } = useAuth();
  const [copied, setCopied] = useState(false);
  const joined = mySailings.some((s) => s.id === sailingId);

  function shareSailing() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {joined ? (
        <span className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-white/20 px-3 py-1.5 font-sans text-xs font-semibold text-white">
          ✓ Aboard
        </span>
      ) : (
        <Link
          href={`/join/${sailingId}`}
          className="whitespace-nowrap rounded-lg bg-white px-3 py-1.5 font-sans text-xs font-semibold text-teal transition-colors hover:bg-white/90"
        >
          ⚓ Join
        </Link>
      )}
      <button
        type="button"
        onClick={shareSailing}
        className="whitespace-nowrap rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 font-sans text-xs font-medium text-white transition-colors hover:bg-white/20"
      >
        {copied ? "✓ Copied" : "🔗 Share"}
      </button>
    </div>
  );
}
