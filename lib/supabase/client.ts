import { createBrowserClient } from "@supabase/ssr";

/**
 * detectSessionInUrl defaults to true, which makes the client auto-detect and
 * exchange a `?code=` in the URL on its own. app/auth/callback/page.tsx does
 * that exchange itself (it needs to sequence profile/join bootstrapping after
 * it), and AuthProvider mounts a client on every page including the callback
 * route — so without this, two exchanges race for the same one-time-use PKCE
 * code/verifier and one of them fails with "code verifier not found in
 * storage".
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { detectSessionInUrl: false } }
  );
}
