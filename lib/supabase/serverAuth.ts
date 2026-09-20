import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BASE64_PREFIX = "base64-";

function fromBase64Url(value: string): string {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

/** Reassembles the (possibly chunked) Supabase session cookie written by
 * the browser client and returns its access token. Deliberately does NOT
 * go through supabase-js's session loading: with an expired access token
 * that would refresh - and rotate - the refresh token on the server, where
 * the new one can't be written back to the browser, risking a later
 * reuse-detection sign-out. An expired token is simply treated as "not
 * signed in" here; the client refreshes its own session and re-requests. */
async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  const chunks = store
    .getAll()
    .map((c) => ({ match: c.name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/), value: c.value }))
    .filter((c): c is { match: RegExpMatchArray; value: string } => c.match !== null);
  if (chunks.length === 0) return null;
  const key = chunks[0].match[1];
  const raw = chunks
    .filter((c) => c.match[1] === key)
    .sort((a, b) => Number(a.match[2] ?? 0) - Number(b.match[2] ?? 0))
    .map((c) => c.value)
    .join("");
  try {
    const json = raw.startsWith(BASE64_PREFIX) ? fromBase64Url(raw.slice(BASE64_PREFIX.length)) : raw;
    const session = JSON.parse(json) as { access_token?: unknown };
    return typeof session.access_token === "string" ? session.access_token : null;
  } catch {
    return null;
  }
}

export type VerifiedRequestUser = {
  userId: string;
  /** Supabase client that sends the caller's own JWT, so RLS and
   * auth.uid() in the database see the real caller, not the anon role. */
  supabase: SupabaseClient;
};

/** The signed-in caller of this server request, or null. The JWT's
 * signature and expiry are verified before it's trusted. */
export async function getVerifiedRequestUser(): Promise<VerifiedRequestUser | null> {
  const token = await readAccessToken();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const plain = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await plain.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { userId: sub, supabase };
}
