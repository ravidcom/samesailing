import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = { title: "Trust & Safety - SameSailing.com" };

export default function TrustSafetyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Trust & Safety" updated="August 2026">
      <p>
        Meeting fellow travelers before you board should feel safe. Here&apos;s
        how SameSailing.com is designed to protect you.
      </p>

      <h2>Privacy by default</h2>
      <ul>
        <li>Your name and email address are never shown to other travelers.</li>
        <li>
          Everyone appears with a partial profile — party type, age range, and
          what they&apos;re looking for — never a full name.
        </li>
        <li>
          All conversations happen inside the app&apos;s group chat and private
          messages, so you never have to share a phone number or personal
          email to say hello.
        </li>
      </ul>

      <h2>Before you meet up</h2>
      <p>
        As with any online introduction, use good judgment before making plans
        with someone you&apos;ve met through the app — meet in public areas of
        the ship first, and trust your instincts.
      </p>

      <h2>Reporting a problem</h2>
      <p>
        If another traveler is behaving inappropriately in the group chat or a
        private message, let us know through the{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>{" "}
        with as much detail as you can share. We review every report.
      </p>

      <h2>Account limits</h2>
      <p>
        To keep sailings feeling like real communities rather than crowded
        marketplaces, we cap how many sailings and how many messages an
        account can send in a given period.
      </p>
    </PolicyPage>
  );
}
