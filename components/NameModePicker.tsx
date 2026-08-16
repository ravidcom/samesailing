"use client";

import type { ReactNode } from "react";
import type { NameMode } from "@/lib/displayName";
import { textInput } from "@/lib/formStyles";

const MODES: { id: NameMode; title: string; body: string }[] = [
  {
    id: "real",
    title: "Use my real name",
    body: "First name and last initial only -",
  },
  {
    id: "nick",
    title: "Use a nickname",
    body: "Anything you like - a crew name, first names, an inside joke.",
  },
  {
    id: "anon",
    title: "Stay anonymous",
    body: "You get a unique handle so people can still tell you apart -",
  },
];

/** Shared with EditProfileModal (live "your handle is X" preview) and the
 * signup flow (no account/userId yet, so just an illustrative example). */
export default function NameModePicker({
  mode,
  onModeChange,
  nickname,
  onNicknameChange,
  lastInitial,
  onLastInitialChange,
  firstName,
  anonExample,
}: {
  mode: NameMode;
  onModeChange: (m: NameMode) => void;
  nickname: string;
  onNicknameChange: (v: string) => void;
  lastInitial: string;
  onLastInitialChange: (v: string) => void;
  firstName: string;
  anonExample: ReactNode;
}) {
  const realNamePreview = `${firstName.trim() || "Alex"}${lastInitial.trim() ? ` ${lastInitial.trim().charAt(0).toUpperCase()}.` : ""}`;

  return (
    <div className="flex flex-col gap-2.5">
      {MODES.map((m) => {
        const selected = mode === m.id;
        return (
          <div
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`cursor-pointer rounded-[13px] border-[1.5px] p-3.5 transition-colors ${
              selected ? "border-teal bg-teal-tint" : "border-border bg-white hover:border-teal-shadow"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-teal bg-teal" : "border-border bg-white"
                }`}
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-charcoal">{m.title}</span>
                  {m.id === "real" ? (
                    <span className="rounded-full bg-[#f2f7f7] px-1.5 py-0.5 text-[10px] font-bold tracking-[.06em] text-muted-2 uppercase">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted">
                  {m.body}{" "}
                  {m.id === "anon" ? <strong className="text-teal">{anonExample}</strong> : null}
                  {m.id === "real" ? <strong className="text-charcoal">{realNamePreview}</strong> : null}
                </div>

                {m.id === "nick" && selected ? (
                  <>
                    <input
                      className={textInput + " mt-2.5"}
                      maxLength={20}
                      placeholder="e.g. Mike & Sarah"
                      value={nickname}
                      onChange={(e) => onNicknameChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mt-1 text-right text-[11px] text-muted-2">{nickname.length}/20</div>
                  </>
                ) : null}

                {m.id === "real" && selected ? (
                  <>
                    <div className="mt-2.5 flex items-center gap-2">
                      <input
                        className={textInput + " w-16 text-center"}
                        maxLength={1}
                        placeholder="L"
                        value={lastInitial}
                        onChange={(e) => onLastInitialChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-[11.5px] leading-relaxed text-muted-2">
                        Last initial - your first name comes from the field above.
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-[9px] bg-[#fdeae6] px-2.5 py-2 text-[11.5px] leading-relaxed text-[#c9503b]">
                      <span>⚠︎</span>
                      <span>Everyone on your sailings will see it. You can switch back any time.</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
