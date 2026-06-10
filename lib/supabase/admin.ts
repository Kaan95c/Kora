import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase admin (service_role) — JAMAIS exposé au navigateur.
 * Réservé aux Route Handlers serveur (auth admin, Storage privilégié…).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
