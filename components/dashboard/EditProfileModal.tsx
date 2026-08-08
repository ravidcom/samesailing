"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth-context";
import { fieldLabel, textInput, primaryButton } from "@/lib/formStyles";

export default function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, country, updateAccount } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [countryDraft, setCountryDraft] = useState(country);

  function save() {
    updateAccount({ name: name.trim() || user?.name, country: countryDraft.trim() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="mb-1 font-display text-lg font-bold text-charcoal">My profile</div>
      <div className="mb-4 text-xs text-muted-2">
        Details that stay the same across all your sailings.
      </div>

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
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-2">
        Who&apos;s coming and what you&apos;re looking for are set per sailing — edit them
        on each cruise card.
      </p>

      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border-[1.5px] border-border py-2.5 font-sans text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
        >
          Cancel
        </button>
        <button type="button" onClick={save} className={primaryButton + " mt-0 flex-1"}>
          Save
        </button>
      </div>
    </Modal>
  );
}
