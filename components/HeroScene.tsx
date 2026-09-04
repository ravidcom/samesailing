"use client";

import { useEffect } from "react";

/** Animated layered hero scene (sun, birds, drifting clouds, sea glints, a
 * bobbing ship), ported verbatim from the .hb-* markup/CSS in
 * SameSailing_3-standalone-src.html - see globals.css for the animation
 * rules this markup depends on. Pauses all animation via #hb-scene.hb-off
 * while the banner is off screen; app/globals.css also freezes it entirely
 * under prefers-reduced-motion. */
export default function HeroScene() {
  useEffect(() => {
    const el = document.getElementById("hb-scene");
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => el.classList.toggle("hb-off", !entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id="hb-scene"
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg,#f7f4ea 0%,#fde8d1 32%,#fbdcc2 59%,#fbdcc2 60%)" }}
    >
      <div className="hb-sun" />
      <div className="hb-bird">
        <svg viewBox="0 0 30 16" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">
          <g stroke="#2a201c" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55">
            <path d="M2 11 q5 -6 10 0" />
            <path d="M17 5 q6 -6 11 0" />
          </g>
        </svg>
      </div>
      <div className="hb-cl hb-cl1">
        <i style={{ inset: 0 }} />
        <i className="b" style={{ left: "15%", top: "-13px", width: "28px", height: "28px" }} />
        <i className="b" style={{ left: "53%", top: "-9px", width: "19px", height: "19px" }} />
      </div>
      <div className="hb-cl hb-cl2">
        <i style={{ inset: 0 }} />
        <i className="b" style={{ left: "18%", top: "-10px", width: "22px", height: "22px" }} />
        <i className="b" style={{ left: "56%", top: "-6px", width: "14px", height: "14px" }} />
      </div>
      <div className="hb-cl hb-cl3">
        <i style={{ inset: 0 }} />
        <i className="b" style={{ left: "20%", top: "-8px", width: "18px", height: "18px" }} />
      </div>
      <div className="hb-sea">
        <div className="hb-grain" />
        <div className="hb-trail" />
        <div className="hb-gl hb-gl1" />
        <div className="hb-gl hb-gl2" />
        <div className="hb-gl hb-gl3" />
      </div>
      <div className="hb-refl" />
      <div className="hb-refl2" />
      <svg className="hb-ship" viewBox="0 0 420 240" aria-hidden="true">
        <defs>
          <pattern id="hbWinA" width="15" height="15" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="9" height="10" rx="1.6" fill="#bfe3e6" />
          </pattern>
          <pattern id="hbWinB" width="15" height="15" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="8" height="9" rx="1.6" fill="#dff1f2" />
          </pattern>
        </defs>
        <g stroke="#ffffff" strokeWidth="1.5" fill="none" opacity=".75" strokeLinecap="round">
          <path d="M140 30 Q244 40 316 150" />
          <path d="M140 30 Q192 52 236 66" />
        </g>
        <rect x="137" y="26" width="3.4" height="46" rx="1.7" fill="#16323c" />
        <path d="M141 29 L167 35.5 L141 42 Z" fill="#e2503f" />
        <rect x="196" y="22" width="34" height="48" rx="5" fill="#17798a" />
        <rect x="196" y="36" width="34" height="11" fill="#e2503f" />
        <rect x="240" y="22" width="34" height="48" rx="5" fill="#17798a" />
        <rect x="240" y="36" width="34" height="11" fill="#e2503f" />
        <rect x="132" y="66" width="142" height="20" rx="3" fill="#ffffff" />
        <rect x="108" y="84" width="192" height="28" rx="3" fill="#ffffff" />
        <rect x="120" y="92" width="168" height="10" fill="url(#hbWinA)" />
        <rect x="84" y="110" width="252" height="32" rx="3" fill="#ffffff" />
        <rect x="96" y="120" width="228" height="10" fill="url(#hbWinA)" />
        <rect x="64" y="140" width="290" height="38" rx="3" fill="#f7fdfd" />
        <rect x="76" y="150" width="266" height="10" fill="url(#hbWinA)" />
        <rect x="76" y="164" width="266" height="10" fill="url(#hbWinA)" />
        <rect x="46" y="198" width="310" height="18" rx="9" fill="#e2503f" />
        <path
          d="M34 176 H336 C368 176 392 182 404 192 C392 206 372 212 340 212 H70 C48 212 36 200 34 190 Z"
          fill="#16323c"
        />
        <rect x="54" y="186" width="270" height="9" fill="url(#hbWinB)" />
      </svg>
    </div>
  );
}
