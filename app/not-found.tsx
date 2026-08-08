import Link from "next/link";
import NavBar from "@/components/NavBar";

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
        <div className="w-full max-w-[440px]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-tint text-3xl">
            🧭
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">
            Page not found
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            We couldn&apos;t find what you were looking for.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-teal px-6 py-3 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            ← Back to search
          </Link>
        </div>
      </main>
    </>
  );
}
