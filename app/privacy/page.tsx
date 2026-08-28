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
        type, age range, country, what you&apos;re looking for on that trip,
        and any optional details you add, such as your travel companions or
        an optional identity badge. We also store the messages you send
        through the Service so we can deliver and display them.
      </p>

      <h2>Who can see your profile</h2>
      <ul>
        <li>
          Each sailing&apos;s passenger board is a <strong>public web
          page</strong> — the profile you create for a sailing can be viewed
          by anyone on the internet, including people without an account,
          and may appear in search engine results.
        </li>
        <li>
          Your email address is never shown to anyone. Your real name is
          only shown if you choose real-name mode — otherwise other people
          see the nickname or anonymous handle you picked.
        </li>
        <li>
          Optional details you add — like children&apos;s ages in a family
          profile, or the LGBTQ+ Member badge — appear on the public board
          too. They&apos;re always your choice, and you can edit or remove
          them at any time.
        </li>
        <li>
          All communication happens through SameSailing.com&apos;s group chat
          and private messages. Contact details are never exchanged through
          the platform.
        </li>
      </ul>

      <h2>Messages and moderation</h2>
      <p>
        Group chat messages are visible to travelers on that sailing.
        Private messages are visible only to their participants — but if a
        participant reports a message, our moderators may review the
        reported content, including private messages, to act on the report.
      </p>

      <h2>How we use your data</h2>
      <p>
        Your travel profile is used to match you with fellow travelers on the
        same sailing and to power features like shared-interest suggestions in
        the group chat. We don&apos;t sell your data to third parties. Your
        data is stored with trusted infrastructure providers (such as our
        database and hosting providers) who process it only on our behalf.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or remove your profile for any sailing, leave a sailing
        entirely, and control email notifications at any time from your
        dashboard. Leaving a sailing removes your profile from its passenger
        board, though messages you already sent may remain visible to their
        recipients. To delete your account and its data entirely, contact us
        and we&apos;ll take care of it.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        SameSailing.com uses only what&apos;s needed to keep you signed in
        and remember your session on your device. We don&apos;t use
        advertising or analytics trackers. If that ever changes, we&apos;ll
        update this policy and ask for your consent where the law requires
        it.
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
