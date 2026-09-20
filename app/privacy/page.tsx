import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy - SameSailing.com" };

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy Policy" updated="September 2026">
      <p>
        SameSailing.com helps travelers on the same cruise connect before they
        board. This page explains what we collect, how it&apos;s used, and what
        stays private.
      </p>

      <h2>What we collect</h2>
      <p>
        When you create an account, we store your name, email address, and the
        travel details you choose to share for each sailing you join — party
        type, gender, age range, country, what you&apos;re looking for on that trip,
        and any optional details you add, such as your travel companions or
        an optional identity badge. We also store the messages you send
        through the Service so we can deliver and display them. Your email
        address is used for your account and, if you opt in, notifications;
        it is never shown to other users.
      </p>

      <h2>Signing in with Google or Facebook</h2>
      <p>
        You can create an account or sign in with Google or Facebook. We
        don’t ask those services for any extra permissions beyond what they
        share by default with an app you sign in to, which is your name and
        email address. We use them to set up your account. We never receive
        your Google or Facebook password.
      </p>

      <h2>Age requirement</h2>
      <p>
        You must be at least 18 years old to create an account (see our{" "}
        <a href="/terms" className="font-semibold text-teal">
          Terms of Use
        </a>
        ). Children can’t hold accounts; if a parent adds details about
        children in their party, those details are part of the parent’s
        profile.
      </p>

      <h2>Who can see your profile</h2>
      <ul>
        <li>
          Each sailing&apos;s passenger board is visible to{" "}
          <strong>signed-in members who joined that sailing</strong>. The
          profile you create for a sailing can be seen by those members.
          Accounts are not verified, so anyone can join a sailing. Passenger
          boards are not indexed by search engines, and visitors without an
          account only see how many travelers have joined.
        </li>
        <li>
          Your email address is never shown to anyone. Your real name is
          only shown if you choose real-name mode — otherwise you pick a
          nickname, or appear under a generated handle until you do.
        </li>
        <li>
          Optional details you add — like children&apos;s ages in a family
          profile, or the LGBTQ+ Member badge — appear on the passenger
          board to members of your sailing too. They&apos;re always your choice, and you can edit or remove
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
        recipients. You can permanently delete your account and its data at
        any time from the <strong>Delete my account</strong> option on your
        profile page — this removes your profile, sailing memberships, and
        account details. See{" "}
        <a href="/data-deletion" className="font-semibold text-teal">
          how to delete your account and data
        </a>
        . As with leaving a sailing, messages you&apos;ve
        already sent may remain visible to their recipients.
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        SameSailing.com uses essential cookies to keep you signed in and
        remember your session — these don&apos;t require consent and can&apos;t
        be turned off. With your consent, given through the cookie banner, we
        also use Google Analytics to understand how the site is used in
        aggregate. Analytics cookies are only set if you accept them, and you
        can decline or change your mind at any time by clearing your
        browser&apos;s site data for SameSailing.com. We don&apos;t use
        advertising trackers or sell data to advertisers.
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
