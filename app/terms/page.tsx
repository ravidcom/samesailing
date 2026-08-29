import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = { title: "Terms of Use - SameSailing.com" };

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms of Use" updated="August 2026">
      <p>
        Welcome to SameSailing.com. These Terms of Use (&ldquo;Terms&rdquo;)
        govern your access to and use of SameSailing.com (the
        &ldquo;Service&rdquo;). By creating an account or otherwise using the
        Service, you agree to these Terms and to our{" "}
        <a href="/privacy" className="font-semibold text-teal">
          Privacy Policy
        </a>
        . If you don&apos;t agree, please don&apos;t use the Service.
      </p>

      <h2>Who can use SameSailing.com</h2>
      <p>
        You must be at least 18 years old to create an account.
        SameSailing.com connects real strangers before they meet in person,
        so the account itself must always be held and used by an adult — even
        if you&apos;re traveling with children on the sailing. Providing
        false information about your age or identity is grounds for
        immediate account removal.
      </p>

      <h2>Not affiliated with any cruise line</h2>
      <p>
        SameSailing.com is an independent service and is not affiliated with,
        endorsed by, or sponsored by any cruise line whose sailings appear on
        the Service. Ship names, itineraries, and sailing dates are used only
        to help you find your sailing and identify fellow travelers on it —
        always confirm your actual booking details with your cruise line or
        travel agent. All cruise line names, ship names, and related
        trademarks belong to their respective owners.
      </p>

      <h2>Your account</h2>
      <p>
        You&apos;re responsible for keeping your login credentials secure and
        for the accuracy of the sailing and travel details you provide.
        Joining a sailing you&apos;re not actually booked on isn&apos;t
        allowed. You can sign up with an email and password, or through
        Google or Facebook — those services have their own terms, which
        apply to your use of them.
      </p>

      <h2>Your sailing profile is publicly visible</h2>
      <p>
        Each sailing&apos;s passenger board is a public web page. The profile
        you create for a sailing — your display name or nickname, avatar,
        party type, age range, country, bio, interests, and any optional
        badges you turn on — appears on that board and can be viewed by{" "}
        <strong>anyone on the internet</strong>, including people without a
        SameSailing.com account, and may appear in search engine results.
        You decide how much to share: your account email is never shown to
        anyone, and your real name is only shown if you choose real-name mode
        instead of a nickname — until you choose either, you&apos;re shown
        under a generated handle. Don&apos;t put anything in your profile you
        wouldn&apos;t want publicly visible.
      </p>

      <h2>Travel companions and children</h2>
      <p>
        If you add details about the people traveling with you — including
        the ages or genders of children in your party — you confirm that you
        are their parent or legal guardian (or have the consent of the adult
        in question), and that you understand those details appear on the
        public passenger board as part of your profile. Children can never
        hold accounts or use the Service themselves.
      </p>

      <h2>Optional identity badges</h2>
      <p>
        Some profile options, such as the LGBTQ+ Member badge, share
        personal information that may be sensitive. These are always
        optional and off by default. If you turn one on, it&apos;s displayed
        publicly on the passenger board like the rest of your profile —
        consider your own comfort and safety, including the laws and
        attitudes of the countries your sailing visits, before enabling
        one. You can turn a badge off at any time.
      </p>

      <h2>Profile photos and content you upload</h2>
      <p>
        If you add a profile photo — whether you upload one or import one
        from Google or Facebook — you confirm that it&apos;s actually a photo
        of you, that you have the right to use it, and that it doesn&apos;t
        contain nudity, sexual content, or anything illegal, hateful, or
        offensive. We may remove any photo or other content that violates
        these rules, and repeated violations can lead to account suspension.
      </p>

      <h2>Using the group chat and messages</h2>
      <ul>
        <li>Be respectful — fellow travelers are real people planning a trip.</li>
        <li>
          Don&apos;t use SameSailing.com to solicit, advertise, or run scams
          against other travelers.
        </li>
        <li>Harassment, hate speech, and impersonation are not tolerated.</li>
        <li>
          Don&apos;t share another traveler&apos;s personal information
          without their consent, and don&apos;t collect or store other
          travelers&apos; information for use outside the Service.
        </li>
      </ul>

      <h2>Content you post</h2>
      <p>
        You keep ownership of the messages and content you post in group
        chats and private messages. By posting, you give us permission to
        store, display, and transmit that content as needed to operate the
        Service — for example, delivering your message to the people
        you&apos;ve sent it to. We may remove content that violates these
        Terms. Messages you&apos;ve already sent may remain visible to
        their recipients or group even after you leave a sailing or your
        account is closed. If you send us feedback or suggestions, we may
        use them freely without obligation to you.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to: access the Service with bots, scrapers, or other
        automated tools; harvest or index user profiles or any other data
        from the Service; probe, disable, or circumvent any security or
        rate-limiting feature; interfere with the Service&apos;s operation
        or place unreasonable load on it; create accounts under false
        identities or for anyone other than yourself; or reverse engineer
        any part of the Service except where the law expressly permits it.
      </p>

      <h2>No guarantee of matches</h2>
      <p>
        SameSailing.com helps you discover fellow travelers on your sailing,
        but we don&apos;t guarantee you&apos;ll find a match, that other
        travelers will respond, or that any plans made through the app will
        go smoothly. Interactions with other users are between you and them —
        use the same good judgment you would with anyone new you meet online.
      </p>

      <h2>Meeting other travelers in person</h2>
      <p>
        SameSailing.com helps you connect with fellow travelers before you
        meet them in person on your sailing. What happens after that —
        meals, tours, excursions, or any other in-person meetup — is
        entirely between you and the other traveler. We don&apos;t run
        background checks on users and can&apos;t verify anyone&apos;s
        identity, intentions, or behavior in person. Use the same caution
        you&apos;d use meeting anyone new: confirm details when you can,
        consider meeting in public areas of the ship first, and trust your
        own judgment. SameSailing.com is not responsible for what happens
        between users offline, including scams, misrepresentation, or
        inappropriate conduct.
      </p>

      <h2>Not for emergencies</h2>
      <p>
        SameSailing.com is a social platform, not a safety or emergency
        service. If you experience a medical emergency, feel unsafe, or
        witness serious misconduct on board, contact ship security, the
        cruise line&apos;s crew, or local emergency services directly —
        don&apos;t rely on SameSailing.com to report or respond to
        emergencies.
      </p>

      <h2>Advertising and travel offers</h2>
      <p>
        SameSailing.com is currently free to use. To help keep it that way,
        the Service may display advertising, sponsored content, or offers for
        cruises and travel-related products from us or third parties, on the
        site or by email. We may introduce paid features in the future — if
        we do, we&apos;ll tell you before anything changes for your account.
      </p>

      <h2>Emails and notifications</h2>
      <p>
        We may send you emails related to your account and your sailings.
        We&apos;ll only send you offers and travel-related promotions if
        you&apos;ve given us your consent to do so — you can give or withdraw
        that consent at any time from your dashboard, or by unsubscribing
        from any promotional email you receive.
      </p>

      <h2>Reports, moderation, and account action</h2>
      <p>
        Travelers can report messages and profiles that violate these Terms.
        When something is reported, our moderators may review the reported
        content — <strong>including private messages that were reported by
        one of their participants</strong> — in order to act on the report.
        We may suspend or terminate any account, at any time, for any reason
        or no reason at all — including in response to reports of
        harassment, fraud, or other misconduct reviewed under our{" "}
        <a href="/trust-safety" className="font-semibold text-teal">
          Trust &amp; Safety
        </a>{" "}
        practices. We may also limit how many sailings you can join or
        messages you can send, to keep sailings feeling like real communities
        rather than crowded marketplaces. We&apos;re not obligated to explain
        a suspension or removal, though we&apos;ll try to when we can.
      </p>

      <h2>Copyright complaints</h2>
      <p>
        If you believe content on the Service infringes your copyright,
        contact us through our{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>{" "}
        with a description of the work, the location of the infringing
        content, and your contact details. We&apos;ll review the complaint
        and remove infringing content where appropriate. Accounts that
        repeatedly infringe others&apos; rights will be terminated.
      </p>

      <h2>Our intellectual property</h2>
      <p>
        The SameSailing.com name, logo, and the design and code of the
        Service belong to us. Nothing in these Terms gives you rights to use
        them outside of your normal use of the Service.
      </p>

      <h2>Changes to the Service</h2>
      <p>
        We may add, change, suspend, or remove any part of the Service — or
        discontinue it entirely — at any time, with or without notice, and
        without liability to you. The Service is free, and we can&apos;t
        promise any feature will exist forever.
      </p>

      <h2>No warranty</h2>
      <p>
        The Service is provided &ldquo;as is,&rdquo; without warranties of
        any kind. We don&apos;t guarantee the Service will be uninterrupted,
        error-free, or free of inaccuracies in sailing data, which is
        provided for reference only.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, SameSailing.com won&apos;t be
        liable for indirect, incidental, or consequential damages arising
        from your use of the Service, or for the conduct of other users —
        online or in person. Our total liability for any claim related to the
        Service is limited to the amount, if any, you&apos;ve paid us in the
        past 12 months. Nothing in these Terms excludes or limits any
        liability that cannot be excluded or limited under applicable law.
      </p>

      <h2>Indemnification</h2>
      <p>
        If your use of the Service, the content you post, or your violation
        of these Terms or of someone else&apos;s rights leads to a claim,
        demand, or legal action against SameSailing.com, you agree to
        indemnify us and hold us harmless from the resulting losses,
        liabilities, and reasonable legal costs.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Israel, without
        regard to conflict-of-law principles. Any dispute arising from these
        Terms or the Service will be handled by the competent courts of
        Israel. If you use the Service from a country whose laws grant you
        rights that cannot be waived by agreement, those rights are not
        affected by this section.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these Terms as the product evolves. For material
        changes, we&apos;ll notify you by email or through the Service
        before the change takes effect. Continued use of SameSailing.com
        after a change means you accept the updated Terms.
      </p>

      <h2>General</h2>
      <p>
        If any part of these Terms is found unenforceable, the rest remains
        in full effect. These Terms are the entire agreement between you and
        SameSailing.com about the Service. We may assign these Terms — for
        example, if the Service is acquired or transferred to a company —
        and they will bind the new operator; you may not assign them.
        Sections that by their nature should survive account closure —
        including content licenses, limitation of liability,
        indemnification, and governing law — survive it. Our not enforcing
        a provision isn&apos;t a waiver of it.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Reach out any time through our{" "}
        <a href="/contact" className="font-semibold text-teal">
          contact page
        </a>
        .
      </p>
    </PolicyPage>
  );
}
