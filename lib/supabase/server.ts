import { createClient } from "@supabase/supabase-js";

/**
 * Plain (non-SSR) client for Server Components that only need anonymous,
 * public reads — e.g. the passenger board, which is browsable pre-login.
 * No cookies/session handling, so it must not be used for anything
 * auth-scoped.
 */
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
