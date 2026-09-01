import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Used in Server Components, Route Handlers, and Server Actions.
//
// Async since Next.js 15: cookies() returns a promise now, so every
// caller has to `await createClient()`.
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Server Components can't write cookies. Harmless here: the
            // proxy refreshes the session on every request, so the
            // refreshed cookie still reaches the browser.
          }
        },
      },
    }
  )
}

// Admin-only client — uses the service_role key, bypasses RLS.
// NEVER import this into client components. Only use inside
// /app/admin server actions / route handlers, after verifying
// the caller's profile.is_admin === true.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
