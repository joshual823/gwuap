'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

type Side = {
  tag: string; tag2: string | null; sentiment: string; bet_type: string
  line: number | null; odds: string | null; odds_book: string | null
  category_id: number | null
  game_id: string; game_league: string; game_starts_at: string | null
}

/**
 * Taking the other side.
 *
 * Two inserts that have to both land: the pick, then the link to it. The
 * pick goes first, because a challenge pointing at a post that doesn't
 * exist is worse than a pick nobody claimed — the first is broken, the
 * second is just an ordinary pick on the timeline.
 *
 * If the update then fails because somebody else got there first, the
 * pick stays. That's the right way round: they did take that side, at
 * that moment, and deleting it to tidy up would be erasing a real pick
 * from a real record.
 */
export default function AcceptChallenge({ challengeId, viewerId, isChallenger, code, side, offer, challenger }: {
  challengeId: string
  viewerId: string | null
  isChallenger: boolean
  code: string
  side: Side
  offer: string
  challenger: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/c/${code}`
    try {
      if (navigator.share) await navigator.share({ url, title: 'Take the other side' })
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    } catch { /* dismissed the sheet, which isn't an error */ }
  }

  async function accept() {
    if (!viewerId) return
    setBusy(true); setError(null)
    const supabase = createClient()

    const { data: post, error: postError } = await supabase.from('posts').insert({
      author_id: viewerId, category_id: side.category_id, post_kind: 'pick',
      tag: side.tag, tag2: side.tag2, sentiment: side.sentiment, bet_type: side.bet_type,
      line: side.line, odds: side.odds, odds_source: 'book', odds_book: side.odds_book,
      money_public: true, game_id: side.game_id, game_league: side.game_league,
      game_starts_at: side.game_starts_at,
      caption: `Taking the other side against @${challenger}.`,
    }).select('id').single()

    if (postError || !post) { setBusy(false); setError(postError?.message ?? 'Could not post that pick.'); return }

    // Only lands if nobody has taken it in the meantime — the policy
    // requires opponent_id to still be null.
    const { data: updated, error: updateError } = await supabase.from('challenges')
      .update({ opponent_id: viewerId, opponent_post_id: post.id, accepted_at: new Date().toISOString() })
      .eq('id', challengeId)
      .select('id')
    setBusy(false)

    if (updateError) { setError(updateError.message); return }
    if (!updated || updated.length === 0) {
      setError('Somebody took this one first. Your pick still posted — it counts either way.')
      return
    }
    router.refresh()
  }

  if (isChallenger) {
    return (
      <div className="ch-cta">
        <p className="ch-cta-line">Nobody has taken it yet. Send it to someone.</p>
        <button className="btn" type="button" onClick={share}>
          {copied ? 'Link copied' : 'Share the challenge'}
        </button>
      </div>
    )
  }

  if (!viewerId) {
    return (
      <div className="ch-cta">
        <p className="ch-cta-line">
          Take <strong>{offer}</strong> against @{challenger}. You&apos;ll need an
          account — it&apos;s free, and there&apos;s nothing to deposit.
        </p>
        <Link href={`/signup?next=/c/${code}`} className="btn">Sign up and take it</Link>
        <Link href={`/login?next=/c/${code}`} className="ch-cta-alt">Already have an account</Link>
      </div>
    )
  }

  return (
    <div className="ch-cta">
      <p className="ch-cta-line">
        Take <strong>{offer}</strong> against @{challenger}. It posts as your pick
        and the final score settles it.
      </p>
      <button className="btn" type="button" onClick={accept} disabled={busy}>
        {busy ? 'Taking it…' : `Take ${offer}`}
      </button>
      {error && <p style={{ color: 'var(--bear)', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  )
}
