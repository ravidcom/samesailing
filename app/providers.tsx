"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import MobileTabBar from "@/components/MobileTabBar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
    </AuthProvider>
  );
}
