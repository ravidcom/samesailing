"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import NameModePicker from "@/components/NameModePicker";
import { useAuth } from "@/lib/auth-context";
import type { NameMode } from "@/lib/displayName";
import { fieldLabel, textInput } from "@/lib/formStyles";

export default function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, country, nameMode, nickname, updateAccount } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [countryDraft, setCountryDraft] = useState(country);
  // "anon" is a legacy value from before the picker dropped that option —
  // treat it the same as never having chosen, so the picker always shows
  // one of the two remaining options selected instead of neither.
  const [modeDraft, setModeDraft] = useState<NameMode>(nameMode === "anon" ? "real" : nameMode);
  const [nickDraft, setNickDraft] = useState(nickname);

  function save() {
    updateAccount({
      name: name.trim() || user?.name,
      country: countryDraft.trim(),
      nameMode: modeDraft,
      nickname: nickDraft.trim(),
    });
    onClose();
  }

  function reset() {
    setName(user?.name ?? "");
    setCountryDraft(country);
    setModeDraft(nameMode === "anon" ? "real" : nameMode);
    setNickDraft(nickname);
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close}>
      <div className="mb-1 font-display text-lg font-bold text-charcoal">My profile</div>
      <div className="mb-4 text-xs text-muted-2">
        Details that stay the same across all your sailings.
      </div>

      <div className="max-h-[65vh] overflow-y-auto pr-1">
      <label className={fieldLabel}>First name</label>
      <input className={textInput} value={name} onChange={(e) => setName(e.target.value)} />

      <label className={fieldLabel + " mt-3"}>Email</label>
      <input className={textInput + " cursor-not-allowed bg-[#f2f7f7] text-muted-2"} value={user?.email ?? ""} disabled />

      <label className={fieldLabel + " mt-3"}>Country</label>
      <input
        className={textInput}
        placeholder="e.g. United States"
        value={countryDraft}
        onChange={(e) => setCountryDraft(e.target.value)}
      />

      <label className={fieldLabel + " mt-4"}>How you appear to other passengers</label>
      <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted-2">
        Only fellow travelers on your sailings can see this. Never your contact details.
      </p>

      <NameModePicker
        mode={modeDraft}
        onModeChange={setModeDraft}
        nickname={nickDraft}
        onNicknameChange={setNickDraft}
        firstName={name}
      />

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted-2">
        Who&apos;s coming and what you&apos;re looking for are set per sailing - edit them
        on each cruise card.
      </p>
      </div>

      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={close}
          className="flex-1 rounded-[11px] border-[1.5px] border-border py-3.5 font-sans text-[15px] font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-[11px] border-none bg-teal py-3.5 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
