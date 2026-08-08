import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function PolicyPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-[100px]">
        <div className="mb-2 text-xs font-semibold tracking-[.04em] text-teal uppercase">
          {eyebrow}
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold text-charcoal">{title}</h1>
        <p className="mb-8 text-xs text-muted-2">Last updated {updated}</p>
        <div className="space-y-6 text-sm leading-relaxed text-muted [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-charcoal [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
