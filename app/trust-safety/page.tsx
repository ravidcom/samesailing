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
        <li>
          Your email address is never shown to anyone, and your real name
          only appears if you choose real-name mode — otherwise you pick a
          nickname, or appear under a generated handle (like &ldquo;Coral
          Family&rdquo;) until you do.
        </li>
        <li>
          Profiles show only what you choose to share — party type, age
          range, country, and what you&apos;re looking for. Passenger boards
          are public pages, so share only what you&apos;re comfortable with
          the world seeing.
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
        If another traveler is behaving inappropriately, use the{" "}
        <strong>Report</strong> option — it&apos;s available on every
        traveler&apos;s profile and on any message in the group chat or a
        private conversation. You can also reach us through the{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>{" "}
        with as much detail as you can share. We review every report, which
        may include reviewing the reported content itself, and can remove
        content or suspend accounts as a result.
      </p>

      <h2>Account limits</h2>
      <p>
        To keep sailings feeling like real communities rather than crowded
        marketplaces, we cap how many sailings an account can join and may
        limit messaging activity.
      </p>
    </PolicyPage>
  );
}
