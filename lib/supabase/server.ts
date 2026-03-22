// Server-side Supabase client — use in API routes and Server Components.
// Handles session cookies automatically via @supabase/ssr.
// In Next.js 15, cookies() is async — this function must be awaited.

import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component context — safe to ignore.
            // Session refresh is handled by middleware.ts instead.
          }
        },
      },
    }
  );
}
