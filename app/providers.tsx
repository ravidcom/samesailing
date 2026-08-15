"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import MobileTabBar from "@/components/MobileTabBar";
import PwaRegister from "@/components/PwaRegister";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
      <PwaRegister />
    </AuthProvider>
  );
}
