import type { NextConfig } from "next";

// Read at build time, same as any NEXT_PUBLIC_* var - this makes the CSP's
// connect-src automatically match whichever Supabase project the current
// build is wired to (production vs. a Preview deployment's separate
// staging project), rather than hardcoding one origin.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWsUrl = supabaseUrl.replace(/^https:/, "wss:");

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' is needed for Next.js's own hydration data and the
  // inline gtag bootstrap @next/third-parties/google injects before
  // loading googletagmanager.com's script - a nonce-based policy would
  // avoid this but isn't currently wired up. The earlier security audit
  // found zero user/DB-content-to-innerHTML paths in this app (the only
  // dangerouslySetInnerHTML uses are static JSON-LD), so the realistic
  // risk this leaves open is low.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWsUrl} https://www.google-analytics.com https://www.googletagmanager.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Report-only for now: this logs violations to the browser console
  // instead of blocking anything, so a wrong assumption above (e.g. about
  // what Google Analytics or Supabase Realtime need) shows up as a
  // console warning rather than a broken login/chat in production. Flip
  // the key to plain `Content-Security-Policy` once a review of the
  // console across a real login + chat + OAuth session comes back clean.
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
