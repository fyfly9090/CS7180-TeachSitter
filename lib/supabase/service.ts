// SERVICE ROLE CLIENT — SERVER ONLY
// This client bypasses Row Level Security entirely.
// Use ONLY for:
//   - /api/match: writing match_evals rows
//   - /api/evals: admin-level reads
// Never import this file in client components or expose the service key.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service role environment variables");
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
