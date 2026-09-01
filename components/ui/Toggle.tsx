"use client";

export default function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${on ? "bg-teal" : "bg-border"}`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left] ${
          on ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}
