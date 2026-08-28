"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { PwaInstallProvider } from "@/lib/pwaInstall";
import MobileTabBar from "@/components/MobileTabBar";
import PwaRegister from "@/components/PwaRegister";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PwaInstallProvider>
        {children}
        <MobileTabBar />
        <PwaRegister />
      </PwaInstallProvider>
    </AuthProvider>
  );
}
