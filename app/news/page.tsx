import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { fetchNews, NEWS_LEAGUES } from '@/lib/news'
import NewsList from '@/components/NewsList'
import JoinCard from '@/components/JoinCard'

export const dynamic = 'force-dynamic'

export default async function NewsPage(props: {
  searchParams: Promise<{ league?: string }>
}) {
  const searchParams = await props.searchParams
  const league = NEWS_LEAGUES.includes(searchParams.league ?? '')
    ? (searchParams.league as string)
    : 'Top'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const items = await fetchNews(league)

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/feed" className="back-link">← Back to feed</Link>
      <h1 className="display" style={{ fontSize: 22, margin: '4px 0 10px' }}>Sports news</h1>

      <div className="chip-row">
        {NEWS_LEAGUES.map(lg => (
          <Link key={lg} href={`/news?league=${encodeURIComponent(lg)}`}
            className={`chip ${lg === league ? 'active' : ''}`}>{lg}</Link>
        ))}
      </div>

      {!user && <JoinCard />}
      <NewsList items={items} league={league === 'Top' ? 'Other' : league} />
    </div>
  )
}
