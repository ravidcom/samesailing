import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Delete your account and data - SameSailing.com",
  description: "How to delete your SameSailing.com account and the data linked to it.",
};

export default function DataDeletionPage() {
  return (
    <PolicyPage eyebrow="Your data" title="Delete your account and data" updated="September 2026">
      <p>
        You can delete your SameSailing.com account and the data linked to it
        at any time. This applies to every account, including accounts created
        by signing in with Google or Facebook.
      </p>

      <h2>Delete your account yourself</h2>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Sign in to SameSailing.com.</li>
        <li>Open your <strong>Profile</strong> from the navigation.</li>
        <li>
          Scroll to the bottom of the page and choose{" "}
          <strong>Delete my account</strong>.
        </li>
        <li>
          Confirm with <strong>Yes, delete my account</strong>.
        </li>
      </ol>
      <p>
        Deleting your account is permanent and can&apos;t be undone. It
        removes your profile, your sailing memberships, and your account
        details, and removes you from every sailing&apos;s passenger board.
        Messages you&apos;ve already sent may remain visible to their
        recipients.
      </p>

      <h2>If you can&apos;t sign in</h2>
      <p>
        Send us a request through our{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>
        , using the email address you signed up with, and tell us you would
        like your account and data deleted.
      </p>

      <h2>More information</h2>
      <p>
        See our{" "}
        <a href="/privacy" className="font-semibold text-teal">
          Privacy Policy
        </a>{" "}
        for what we collect and who can see it.
      </p>
    </PolicyPage>
  );
}
