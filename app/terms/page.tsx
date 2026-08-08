import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = { title: "Terms of Use - SameSailing.com" };

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms of Use" updated="August 2026">
      <p>
        By creating an account on SameSailing.com, you agree to these terms.
        Please read them along with our{" "}
        <a href="/privacy" className="font-semibold text-teal">
          Privacy Policy
        </a>
        .
      </p>

      <h2>Your account</h2>
      <p>
        You&apos;re responsible for keeping your login credentials secure and
        for the accuracy of the sailing and travel details you provide. Joining
        a sailing you&apos;re not actually booked on isn&apos;t allowed.
      </p>

      <h2>Using the group chat and messages</h2>
      <ul>
        <li>Be respectful — fellow travelers are real people planning a trip.</li>
        <li>
          Don&apos;t use SameSailing.com to solicit, advertise, or run scams
          against other travelers.
        </li>
        <li>Harassment, hate speech, and impersonation are not tolerated.</li>
      </ul>

      <h2>No guarantee of matches</h2>
      <p>
        SameSailing.com helps you discover fellow travelers on your sailing,
        but we don&apos;t guarantee you&apos;ll find a match, that other
        travelers will respond, or that any plans made through the app will
        go smoothly.
      </p>

      <h2>Account removal</h2>
      <p>
        We may suspend or remove accounts that violate these terms, including
        reports of harassment or fraudulent behavior reviewed under our{" "}
        <a href="/trust-safety" className="font-semibold text-teal">
          Trust &amp; Safety
        </a>{" "}
        practices.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the product evolves. Continued use of
        SameSailing.com after a change means you accept the updated terms.
      </p>
    </PolicyPage>
  );
}
