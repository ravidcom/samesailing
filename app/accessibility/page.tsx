import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = { title: "Accessibility - SameSailing.com" };

export default function AccessibilityPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Accessibility" updated="August 2026">
      <p>
        We want SameSailing.com to be usable by everyone, including people who
        use a screen reader, navigate by keyboard, or rely on other assistive
        technology.
      </p>

      <h2>Our approach</h2>
      <p>
        We&apos;re working towards meeting the Web Content Accessibility
        Guidelines (WCAG) 2.1 at level AA as our target standard.
        SameSailing.com is a young, actively-developed product, and we
        don&apos;t yet claim full compliance — accessibility is something
        we&apos;re improving continuously as the Service grows, not a box
        we&apos;ve checked once and moved on from.
      </p>

      <h2>Run into a barrier?</h2>
      <p>
        If you find part of SameSailing.com difficult or impossible to use
        with assistive technology, please tell us through our{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>
        . Let us know what you were trying to do, what device and assistive
        technology you were using, and what happened — we read every message
        and prioritize fixing genuine barriers to access.
      </p>
    </PolicyPage>
  );
}
