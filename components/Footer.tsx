import Link from "next/link";
import LogoMark from "./LogoMark";

export default function Footer() {
  return (
    <footer className="border-t border-border px-8 py-9 text-center">
      <div className="mb-3 flex items-center justify-center gap-1 font-display text-[19px] font-bold text-charcoal">
        <LogoMark className="h-[26px] w-[26px] shrink-0" />
        <span>
          same<span className="text-teal">sailing</span>
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-[22px] text-[13px] text-muted-2">
        <Link href="/privacy" className="hover:text-muted">
          Privacy policy
        </Link>
        <Link href="/terms" className="hover:text-muted">
          Terms of use
        </Link>
        <Link href="/trust-safety" className="hover:text-muted">
          Trust &amp; safety
        </Link>
        <Link href="/accessibility" className="hover:text-muted">
          Accessibility
        </Link>
        <Link href="/contact" className="hover:text-muted">
          Contact
        </Link>
      </div>
      <div className="mt-4 flex justify-center">
        <a
          href="https://www.facebook.com/profile.php?id=61593959883367"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="SameSailing on Facebook"
          className="text-muted-2 transition-colors hover:text-teal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
