export default function PrideStripe({ className = "h-3 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-[3px] align-middle ${className}`}
      style={{
        background:
          "linear-gradient(180deg, #e02020 0 16.66%, #f08a1c 16.66% 33.33%, #f5e01c 33.33% 50%, #3fae4a 50% 66.66%, #2a6fd6 66.66% 83.33%, #8e3fd6 83.33% 100%)",
      }}
    />
  );
}
