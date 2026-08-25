import { redirect } from 'next/navigation'

// The feed is the real landing page — it already renders a signed-out hero
// for visitors and the timeline for signed-in users, so "/" just points there.
export default function RootPage() {
  redirect('/feed')
}
