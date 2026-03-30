// Admin Supabase client — uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
// Use ONLY for server-side operations that legitimately need to write
// across user boundaries (e.g. match_evals insert in /api/match).
// Never expose this client or its key to the browser.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
