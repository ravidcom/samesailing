"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CONSENT_KEY = "samesailing:cookieConsent";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type Consent = "granted" | "denied" | null;

function readStoredConsent(): Consent {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    // localStorage unavailable (private browsing, blocked storage) - treat
    // as "no choice yet" rather than crashing; the banner just reappears.
    return null;
  }
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [detected, setDetected] = useState(false);

  // Genuinely an effect, not render-time sync: the banner must be absent on
  // the server-rendered HTML (no localStorage there) and can only decide
  // whether to appear after mounting in the browser, or hydration would
  // mismatch against whatever the very first client render computed.
  useEffect(() => {
    (async () => {
      setConsent(readStoredConsent());
      setDetected(true);
    })();
  }, []);

  function choose(value: "granted" | "denied") {
    setConsent(value);
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Choice still applies for this page load even if it can't persist.
    }
  }

  return (
    <>
      {GA_ID && consent === "granted" ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');`}
          </Script>
        </>
      ) : null}

      {detected && consent === null ? (
        <div className="fixed inset-x-0 bottom-0 z-[250] border-t border-border bg-white px-4 py-3.5 shadow-[0_-8px_24px_rgba(0,0,0,.08)]">
          <div className="mx-auto flex max-w-[820px] flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-center text-[12.5px] leading-relaxed text-muted sm:text-left">
              We use essential cookies to keep you signed in. With your consent, we&apos;d also like to use
              analytics cookies to understand how the site is used.{" "}
              <a href="/privacy" className="font-semibold text-teal">
                Learn more
              </a>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="rounded-full border-[1.5px] border-border px-4 py-2 font-sans text-[13px] font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => choose("granted")}
                className="rounded-full border-none bg-teal px-4 py-2 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
