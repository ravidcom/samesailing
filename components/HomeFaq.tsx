const FAQS = [
  {
    q: "Is SameSailing.com affiliated with any cruise line?",
    a: "No. SameSailing.com is an independent service, not affiliated with, endorsed by, or sponsored by any cruise line. We use public sailing schedules to help you find your exact departure and connect with other passengers booked on the same cruise.",
  },
  {
    q: "Is SameSailing.com free to use?",
    a: "Yes, SameSailing.com is currently free. You can create a profile, browse a passenger board, and chat with fellow cruisers at no cost.",
  },
  {
    q: "Will other passengers see my real name or contact details?",
    a: "Only if you choose to. Your profile appears on your sailing's passenger board, but your email is never shown, and your real name only appears if you pick real-name mode - otherwise you choose a nickname, or you're shown under a generated handle (like \"Coral Family\") until you do.",
  },
  {
    q: "How do I find my cruise's passenger board?",
    a: "Search by cruise line, ship, and departure date above to land directly on your exact sailing's passenger board - no account needed to browse who else is already on it.",
  },
  {
    q: "Can I use SameSailing.com solo, with family, or with a group?",
    a: "Yes - when you join a sailing you set your party type (solo, couple, family, or friends), so fellow travelers on your cruise know a bit about who they're meeting before they say hello.",
  },
];

export default function HomeFaq() {
  return (
    <div className="border-t border-border bg-input px-4 py-16 sm:px-8 md:px-12">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-2.5 text-center font-sans text-[13px] font-semibold text-teal">
          Questions
        </div>
        <h2 className="mb-4 text-center font-display text-2xl font-bold tracking-[-0.01em] sm:text-[28px]">
          Frequently asked questions
        </h2>
        <p className="mb-10 text-center text-sm leading-relaxed text-muted">
          SameSailing.com exists to make one part of cruising better: knowing who else is on your sailing before you
          set foot on the ship.
        </p>
        <div className="space-y-5">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-[16px] border-[1.5px] border-border bg-white px-5 py-4">
              <div className="mb-1.5 font-display text-[15px] font-bold text-charcoal">{item.q}</div>
              <p className="text-[13.5px] leading-relaxed text-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        // FAQPage structured data - eligible for a rich result in Google
        // search showing these questions directly under the listing.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </div>
  );
}
