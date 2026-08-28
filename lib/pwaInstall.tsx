"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** Not in the standard DOM lib yet - Chromium's own install-prompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PwaInstallValue = {
  /** True once the browser has signalled the app is installable (Chrome/Edge/Android). */
  canInstall: boolean;
  /** iOS Safari (and in-app iOS browsers) never fire beforeinstallprompt - there's no
   * automatic path, only the manual Share -> Add to Home Screen flow. */
  isIOS: boolean;
  /** Already running as an installed app - nothing left to offer. */
  isStandalone: boolean;
  /** Shows the native install prompt. No-op if the browser hasn't offered one. */
  promptInstall: () => Promise<void>;
};

const PwaInstallContext = createContext<PwaInstallValue | null>(null);

function detectIOS(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return true;
  // iPadOS 13+ reports as "MacIntel" but is touch-only, unlike an actual Mac.
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own (non-standard) flag for "launched from the home screen".
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [detected, setDetected] = useState(false);

  // Render-time sync, not an effect: window/navigator reads are only safe
  // once mounted in the browser (this renders once server-side too), and
  // `detected` guards it to run exactly once, same pattern used for
  // localStorage-backed state elsewhere in this app.
  if (!detected && typeof window !== "undefined") {
    setDetected(true);
    setIsIOS(detectIOS());
    setIsStandalone(detectStandalone());
  }

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
    // Covers installing from the browser's own UI while this tab stays open.
    const media = window.matchMedia("(display-mode: standalone)");
    function handleDisplayModeChange(e: MediaQueryListEvent) {
      if (e.matches) setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    media.addEventListener("change", handleDisplayModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      media.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // A given prompt event can only be used once, accepted or not.
    setDeferredPrompt(null);
  }

  return (
    <PwaInstallContext.Provider value={{ canInstall: !!deferredPrompt, isIOS, isStandalone, promptInstall }}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error("usePwaInstall must be used within a PwaInstallProvider");
  return ctx;
}
