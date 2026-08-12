"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import MobileTabBar from "@/components/MobileTabBar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <MobileTabBar />
    </AuthProvider>
  );
}
