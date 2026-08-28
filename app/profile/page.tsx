"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import NameModePicker from "@/components/NameModePicker";
import NotificationSettings from "@/components/dashboard/NotificationSettings";
import InstallAppButton from "@/components/ui/InstallAppButton";
import { useAuth } from "@/lib/auth-context";
import type { NameMode } from "@/lib/displayName";
import { fieldLabel, textInput, errorText } from "@/lib/formStyles";

export default function ProfilePage() {
  const { loading, loggedIn, user, country, hasPassword, nameMode, nickname, updateAccount, updatePassword } =
    useAuth();
  const router = useRouter();
  // "anon" is a legacy value from before the picker dropped that option —
  // treat it the same as never having chosen, so the picker always shows
  // one of the two remaining options selected instead of neither.
  const [modeDraft, setModeDraft] = useState<NameMode>(nameMode === "anon" ? "real" : nameMode);
  const [nickDraft, setNickDraft] = useState(nickname);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  function save() {
    updateAccount({
      nameMode: modeDraft,
      nickname: nickDraft.trim(),
    });
    router.push("/dashboard");
  }

  async function changePassword() {
    setPasswordSaved(false);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordError("");
    setChangingPassword(true);
    const result = await updatePassword(newPassword);
    setChangingPassword(false);
    if (result.error) {
      setPasswordError(result.error);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="pt-[62px]" />
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <NavBar />
        <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
          <div className="w-full max-w-[420px]">
            <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">Sign in to see your profile</h1>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-teal px-6 py-3 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
            >
              Sign in →
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[480px] px-4 pt-[100px] pb-16">
        <div className="mb-1 font-display text-xl font-bold text-charcoal">My profile</div>
        <div className="mb-6 text-sm text-muted-2">Details that stay the same across all your sailings.</div>

        <label className={fieldLabel}>First name</label>
        <input className={textInput + " cursor-not-allowed bg-[#f2f7f7] text-muted-2"} value={user?.name ?? ""} disabled />

        <label className={fieldLabel + " mt-3"}>Email</label>
        <input className={textInput + " cursor-not-allowed bg-[#f2f7f7] text-muted-2"} value={user?.email ?? ""} disabled />

        <label className={fieldLabel + " mt-3"}>Country</label>
        <input className={textInput + " cursor-not-allowed bg-[#f2f7f7] text-muted-2"} value={country} disabled />

        <label className={fieldLabel + " mt-5"}>How you appear to other passengers</label>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted-2">
          Only fellow travelers on your sailings can see this. Never your contact details.
        </p>

        <NameModePicker
          mode={modeDraft}
          onModeChange={setModeDraft}
          nickname={nickDraft}
          onNicknameChange={setNickDraft}
          firstName={user?.name ?? ""}
        />

        <p className="mt-3 text-[11.5px] leading-relaxed text-muted-2">
          Who&apos;s coming and what you&apos;re looking for are set per sailing - edit them on each cruise card.
        </p>

        {hasPassword ? (
          <>
            <label className={fieldLabel + " mt-5"}>Change password</label>
            <input
              type="password"
              className={textInput}
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className={textInput + " mt-2"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {passwordError ? <div className={errorText}>{passwordError}</div> : null}
            {passwordSaved ? <div className="mt-2 text-xs font-semibold text-teal">Password updated.</div> : null}
            <button
              type="button"
              onClick={changePassword}
              disabled={changingPassword}
              className="mt-2.5 w-full rounded-[11px] border-[1.5px] border-border py-2.5 font-sans text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-60"
            >
              {changingPassword ? "Updating…" : "Update password"}
            </button>
          </>
        ) : null}

        <div id="notification-settings" className="scroll-mt-[74px]">
          <NotificationSettings />
        </div>

        <div className="mt-8">
          <InstallAppButton />
        </div>

        <div className="mt-6 flex gap-2.5">
          <Link
            href="/dashboard"
            className="flex-1 rounded-[11px] border-[1.5px] border-border py-3.5 text-center font-sans text-[15px] font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-[11px] border-none bg-teal py-3.5 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Save
          </button>
        </div>
      </main>
    </>
  );
}
