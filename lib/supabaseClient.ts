import { createBrowserClient } from '@supabase/ssr'

// These come from your Supabase project settings (Project Settings > API).
// They are safe to expose in the browser — RLS policies protect your data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
