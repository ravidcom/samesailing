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
    <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[#eef4f5] pt-5">
      {joined ? (
        <span className="flex items-center gap-1.5 rounded-xl bg-teal px-6 py-3 font-sans text-sm font-semibold text-white">
          ✓ You&apos;re aboard
        </span>
      ) : (
        <Link
          href={`/join/${sailingId}`}
          className="rounded-xl bg-teal px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          ⚓ Join this sailing
        </Link>
      )}
      <button
        type="button"
        onClick={shareSailing}
        className="rounded-xl border-[1.5px] border-border bg-white px-6 py-3 font-sans text-sm font-medium text-muted transition-colors hover:border-teal hover:text-teal"
      >
        {copied ? "✓ Link copied" : "🔗 Share sailing"}
      </button>
    </div>
  );
}
