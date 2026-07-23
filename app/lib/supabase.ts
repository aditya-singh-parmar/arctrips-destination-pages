import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when Supabase env is present. Content layer falls back to placeholders otherwise. */
export const supabaseConfigured = Boolean(URL && ANON);

/**
 * Read-only server client for Server Components. Uses the anon key (RLS applies).
 * Returns null when Supabase is not configured so callers can fall back gracefully.
 * No cookie writes here — these pages are public and read-only.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  return createServerClient(URL, ANON, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/**
 * Service-role client for trusted server-side ingestion tasks (e.g. importing
 * the article corpus). Never import this into a Client Component.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!URL || !SERVICE) return null;
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}
