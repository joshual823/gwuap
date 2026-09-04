import { createClient } from '@/lib/supabaseServer'
import { FOUNDING_LIMIT } from '@/lib/badges'

export const dynamic = 'force-dynamic'

/**
 * How many founding places are left.
 *
 * Public and read-only — it's a count of a public column, and the whole
 * point is that people can see it going down.
 */
export async function GET() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .contains('badges', ['founding'])

  // A number that might be wrong is worse than no number here, since the
  // whole claim is that the count is real.
  if (error || count === null) return Response.json({ remaining: null })

  return Response.json({
    remaining: Math.max(0, FOUNDING_LIMIT - count),
    limit: FOUNDING_LIMIT,
  })
}
