export default function PrideStripe({
  className = "h-3 w-4",
  outlined = false,
}: {
  className?: string;
  /** A hairline outline so the bar reads as a deliberate badge rather than
   * a stray gradient on a light background - used where it sits directly
   * on white (e.g. next to a name), not where it's already on a tinted pill. */
  outlined?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-[3px] align-middle ${className}`}
      style={{
        background:
          "linear-gradient(180deg, #e02020 0 16.66%, #f08a1c 16.66% 33.33%, #f5e01c 33.33% 50%, #3fae4a 50% 66.66%, #2a6fd6 66.66% 83.33%, #8e3fd6 83.33% 100%)",
        boxShadow: outlined ? "0 0 0 1px rgba(42,32,28,.12)" : undefined,
      }}
    />
  );
}
