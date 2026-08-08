import Link from "next/link";
import LogoMark from "./LogoMark";

export default function Footer() {
  return (
    <footer className="border-t border-border px-8 py-9 text-center">
      <div className="mb-3 flex items-center justify-center gap-1.5 font-display text-base font-bold text-charcoal">
        <LogoMark className="h-[19px] w-[19px] shrink-0" />
        same<span className="text-teal">sailing.com</span>
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
        <Link href="/contact" className="hover:text-muted">
          Contact
        </Link>
      </div>
    </footer>
  );
}
