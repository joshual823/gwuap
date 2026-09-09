import { redirect } from 'next/navigation'

// The feed is the real landing page — it already renders a signed-out hero
// for visitors and the timeline for signed-in users, so "/" just points there.
//
// The query string is carried across deliberately. A bare redirect drops
// it, which quietly destroys campaign tags: gwuap.co/?utm_source=x lands
// on /feed with nothing attached, and the visit is recorded as if it
// arrived from nowhere. That matters more than it sounds — Safari blocks
// the ad pixels outright, so UTM tags in our own analytics are the only
// independent count of what an ad actually delivered.
export default async function RootPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(v => qs.append(key, v))
    else if (value != null) qs.set(key, value)
  }
  const query = qs.toString()
  redirect(query ? `/feed?${query}` : '/feed')
}
