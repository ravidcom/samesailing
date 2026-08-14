import { useId } from "react";

export default function LogoMark({ className }: { className?: string }) {
  const clipId = useId();
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <clipPath id={clipId}>
        <rect x="16" y="7" width="16" height="18" />
      </clipPath>
      <circle cx="12" cy="16.5" r="8.5" fill="#2a201c" />
      <circle cx="20" cy="16.5" r="8.5" fill="#0E8C99" fillOpacity=".92" />
      <g fill="#2a201c" stroke="#fff" strokeWidth=".7">
        <rect x="14.4" y="9.75" width="3.2" height="2.1" rx=".6" />
        <rect x="12.75" y="11.65" width="6.5" height="2.1" rx=".6" />
        <rect x="11" y="13.75" width="10" height="2.25" rx=".6" />
        <path d="M8.5 16 H23.5 L17.9 22.3 Q16 23 14.1 22.3 Z" strokeWidth=".75" strokeLinejoin="round" />
      </g>
      <g clipPath={`url(#${clipId})`} fill="#0E8C99" stroke="#fff" strokeWidth=".7">
        <rect x="14.4" y="9.75" width="3.2" height="2.1" rx=".6" />
        <rect x="12.75" y="11.65" width="6.5" height="2.1" rx=".6" />
        <rect x="11" y="13.75" width="10" height="2.25" rx=".6" />
        <path d="M8.5 16 H23.5 L17.9 22.3 Q16 23 14.1 22.3 Z" strokeWidth=".75" strokeLinejoin="round" />
      </g>
      <path d="M16 10 V22.7" stroke="#fff" strokeWidth=".75" fill="none" strokeLinecap="round" />
      <rect x="13.6" y="12.4" width="4.8" height=".8" rx=".4" fill="#fff" />
      <path d="M6.75 21.5 Q9.25 20.65 11.75 21.4" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M20.25 21.4 Q22.75 20.65 25.25 21.5" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}
