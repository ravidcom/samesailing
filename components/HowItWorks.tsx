const STEPS = [
  {
    bg: "#dff1f2",
    icon: "🔍",
    title: "Find your sailing",
    body: "Search by ship and date to land on your sailing's passenger board.",
  },
  {
    bg: "#fff3eb",
    icon: "👀",
    title: "Browse profiles",
    body: "See party types, languages, and interests. Names and contact details stay hidden.",
  },
  {
    bg: "#dff1f2",
    icon: "💬",
    title: "Chat in the group",
    body: "Join your sailing's group chat. Coordinate excursions, dinner plans, and more.",
  },
  {
    bg: "#fff3eb",
    icon: "✉️",
    title: "DM privately",
    body: "Send a private message to anyone on your sailing. No contact info ever shared.",
  },
];

export default function HowItWorks() {
  return (
    <div className="mt-[50px] border-t border-border bg-white px-4 py-16 sm:px-8 md:px-12">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-2.5 text-center font-sans text-[13px] font-semibold text-teal">
          How it works
        </div>
        <h2 className="mb-11 text-center font-display text-2xl font-bold tracking-[-0.01em] sm:text-[28px] lg:text-[32px]">
          From search to sailing companions in four steps
        </h2>
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-[20px] border-[1.5px] border-border bg-input px-[22px] py-[26px]"
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-[13px] text-[22px]"
                style={{ background: step.bg }}
              >
                {step.icon}
              </div>
              <div className="mb-[7px] font-display text-[17px] font-bold">
                {step.title}
              </div>
              <div className="text-[13px] leading-[1.6] text-muted">
                {step.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
