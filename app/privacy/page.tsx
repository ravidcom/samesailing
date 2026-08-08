import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy - SameSailing.com" };

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy Policy" updated="August 2026">
      <p>
        SameSailing.com helps travelers on the same cruise connect before they
        board. This page explains what we collect, how it&apos;s used, and what
        stays private.
      </p>

      <h2>What we collect</h2>
      <p>
        When you create an account, we store your name, email address, and the
        travel details you choose to share for each sailing you join — party
        type, age range, country, and what you&apos;re looking for on that trip.
      </p>

      <h2>What other travelers see</h2>
      <ul>
        <li>Your real name and email address are never shown to other users.</li>
        <li>
          Other travelers see a partial profile instead — like &ldquo;Family ·
          ages 35–45&rdquo; — built from the details you provide when you join
          a sailing.
        </li>
        <li>
          All communication happens through SameSailing.com&apos;s group chat
          and private messages. Contact details are never exchanged through
          the platform.
        </li>
      </ul>

      <h2>How we use your data</h2>
      <p>
        Your travel profile is used to match you with fellow travelers on the
        same sailing and to power features like shared-interest suggestions in
        the group chat. We don&apos;t sell your data to third parties.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or remove your profile for any sailing, leave a sailing
        entirely, and control email notifications at any time from your
        dashboard.
      </p>

      <h2>Questions</h2>
      <p>
        Reach out any time through our{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>
        .
      </p>
    </PolicyPage>
  );
}
