"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** Only shows up when you've joined more than one sailing and are looking
 * at one of your own - otherwise there's nothing useful to switch to. */
export default function SailingSwitcher({ currentId }: { currentId: string }) {
  const { mySailings } = useAuth();
  const router = useRouter();

  if (mySailings.length < 2 || !mySailings.some((s) => s.id === currentId)) return null;

  return (
    <select
      className="mb-3 w-auto max-w-full cursor-pointer rounded-full border-[1.5px] border-border bg-white px-3.5 py-1.5 font-sans text-sm font-semibold text-charcoal transition-colors hover:border-teal"
      value={currentId}
      onChange={(e) => router.push(`/sailing/${e.target.value}/board`)}
    >
      {mySailings.map((s) => (
        <option key={s.id} value={s.id}>
          🚢 {s.shipName} · {s.date}
        </option>
      ))}
    </select>
  );
}
