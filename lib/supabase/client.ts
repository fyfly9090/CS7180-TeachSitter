'use client'
// Browser-side Supabase client — use in Client Components only.
// Never import this in API routes or Server Components; use lib/supabase/server.ts instead.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
