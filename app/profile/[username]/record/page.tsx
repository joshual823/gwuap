import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { isValidUsername } from '@/lib/username'
import { buildRecord, splitLateEntries, type Settled } from '@/lib/record'
import { formatSignedUsd, profitForStatus } from '@/lib/odds'
import { MIN_GRADED_PICKS } from '@/lib/rules'
import ShareRow from '@/components/ShareRow'
import { SITE_URL } from '@/lib/brand'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return { title: `@${username} — record` }
}

/** A win rate is only worth colouring once it means something. */
function tone(pct: number | null, decided: number): string {
  if (pct === null || decided < 3) return ''
  return pct >= 52.4 ? 'pos' : pct < 45 ? 'neg' : ''
}

function SplitTable({ title, rows, note }: {
  title: string
  rows: ReturnType<typeof buildRecord>['byLeague']
  note: string
}) {
  if (rows.length === 0) return null
  return (
    <section className="rec-section">
      <h2 className="rec-h2">{title}</h2>
      <p className="rec-note">{note}</p>
      <div className="rec-table">
        {rows.map(s => (
          <div className="rec-row" key={s.key}>
            <span className="rec-label">{s.label}</span>
            <span className="rec-wl mono">{s.wins}-{s.losses}{s.pushes > 0 && `-${s.pushes}`}</span>
            <span className={`rec-pct mono ${tone(s.winPct, s.decided)}`}>
              {s.winPct === null ? '—' : `${s.winPct}%`}
            </span>
            <span className={`rec-profit mono ${s.profit >= 0 ? 'pos' : 'neg'}`}>
              {s.profit === 0 ? '—' : formatSignedUsd(s.profit)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function RecordPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const asked = decodeURIComponent(username).replace(/^@/, '')
  if (!isValidUsername(asked)) notFound()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('id, username').ilike('username', asked).maybeSingle()
  // The lookup is an ilike and `_` is a wildcard, so confirm the row is
  // the one that was asked for — same reasoning as /api/login.
  if (!profile || profile.username.toLowerCase() !== asked.toLowerCase()) notFound()

  const { data } = await supabase
    .from('posts')
    .select('status, profit, odds, stake, game_league, bet_type, odds_source, graded_at, created_at, late_entry')
    .eq('author_id', profile.id)
    .eq('post_kind', 'pick')
    .in('status', ['win', 'loss', 'push', 'void'])

  // Profit is resolved here rather than in buildRecord, which stays pure:
  // older picks were graded before the column existed and carry it only
  // implicitly, in the price and the amount.
  const picks: Settled[] = (data ?? []).map((p: any) => ({
    status: p.status,
    profit: p.profit ?? profitForStatus(p.status, p.odds, p.stake) ?? 0,
    game_league: p.game_league,
    bet_type: p.bet_type,
    odds_source: p.odds_source,
    graded_at: p.graded_at,
    created_at: p.created_at,
    late_entry: p.late_entry ?? false,
  }))

  // Two records, never one. A late entry is a real graded pick and gets
  // counted — just not next to picks made before the whistle, because a
  // single number covering both would overstate what the record means.
  const { onTime, late } = splitLateEntries(picks)
  const r = buildRecord(onTime)
  const lateRecord = late.length > 0 ? buildRecord(late.map(p => ({ ...p, late_entry: false }))) : null
  const shortOf = Math.max(0, MIN_GRADED_PICKS - r.decided)

  return (
    <div className="legal">
      <p className="rec-back">
        <Link href={`/profile/${profile.username}`} className="help-link">
          ← @{profile.username}
        </Link>
      </p>
      <h1 className="page-title">The record</h1>
      <p className="legal-sub">
        Every pick the scoreboard settled, split up. Graded automatically —
        never self-reported, and never edited after the fact.
      </p>

      {r.decided === 0 && lateRecord === null ? (
        <p className="rec-empty">
          Nothing settled yet. Post a pick on a game that hasn&apos;t started and
          it grades itself once the final score is in.
        </p>
      ) : (
        <>
          <div className="stat-strip">
            <div className="stat-block">
              <span className="stat-figure">{r.wins}-{r.losses}{r.pushes > 0 && `-${r.pushes}`}</span>
              <span className="stat-label">Record</span>
            </div>
            <div className="stat-block">
              <span className={`stat-figure ${tone(r.winPct, r.decided)}`}>
                {r.winPct === null ? '—' : `${r.winPct}%`}
              </span>
              <span className="stat-label">Win rate</span>
            </div>
            <div className="stat-block">
              <span className={`stat-figure ${r.profit >= 0 ? 'pos' : 'neg'}`}>
                {r.profit === 0 ? '—' : formatSignedUsd(r.profit)}
              </span>
              <span className="stat-label">Profit</span>
            </div>
          </div>

          {/* The run, and the last ten. Both are what people actually ask
              each other, and neither is derivable from the numbers above. */}
          <section className="rec-section">
            <h2 className="rec-h2">Form</h2>
            <p className="rec-note">
              Last {r.form.length} settled, most recent first. Pushes aren&apos;t shown —
              they decide nothing.
            </p>
            <div className="rec-form">
              {r.form.map((f, i) => (
                <span key={i} className={`rec-pip ${f}`} title={f}>{f === 'win' ? 'W' : 'L'}</span>
              ))}
            </div>
            <p className="rec-streak">
              {r.streak > 0 && <><strong>{r.streak} in a row</strong> right now.</>}
              {r.streak < 0 && <><strong>{-r.streak} down</strong> in a row right now.</>}
              {r.streak === 0 && <>No run going.</>}
              {r.bestStreak > 1 && <> Longest winning run: <strong>{r.bestStreak}</strong>.</>}
            </p>
          </section>

          <SplitTable
            title="By league"
            rows={r.byLeague}
            note="Most-played first. A league with two picks in it isn't a finding."
          />
          <SplitTable
            title="By bet type"
            rows={r.byBetType}
            note="The split people are most often wrong about — being good at sides says nothing about totals."
          />

          {/* The card lives here rather than in the profile header. It's
              an action about the record, this is the record, and three
              buttons across the top of a profile is what overlapped the
              name in the first place. */}
          <section className="rec-section">
            <h2 className="rec-h2">Share it</h2>
            <p className="rec-note">
              A card of this week&apos;s settled picks, wins and losses both.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              <Link href={`/receipts/${profile.username}`} className="btn">See the card</Link>
            </p>
            <ShareRow url={`${SITE_URL}/receipts/${profile.username}`}
              text={`My record on Gwuap — graded from the final score`} />
          </section>

          <p className="rec-foot">
            Profit counts only picks priced from a book. Money you entered by
            hand is yours to track and isn&apos;t part of a public record.
            {shortOf > 0 && <> {shortOf} more settled {shortOf === 1 ? 'pick' : 'picks'} puts you on the leaderboard.</>}
          </p>
        </>
      )}

      {/* Its own section, below the record and visibly not part of it.
          These are graded picks and they count as picks — they just
          weren't made before the whistle, and a reader has to be able to
          see which is which without being told. */}
      {lateRecord && (
        <section className="rec-section late-section">
          <h2 className="rec-h2">Late entries</h2>
          <p className="rec-note">
            Posted more than fifteen minutes after the game started. Graded the
            same way, kept out of the record above and off the leaderboard —
            a pick made once the game is under way isn&apos;t the same claim as
            one made before it.
          </p>
          <div className="stat-strip">
            <div className="stat-block">
              <span className="stat-figure">
                {lateRecord.wins}-{lateRecord.losses}{lateRecord.pushes > 0 && `-${lateRecord.pushes}`}
              </span>
              <span className="stat-label">Late record</span>
            </div>
            <div className="stat-block">
              <span className="stat-figure">
                {lateRecord.winPct === null ? '—' : `${lateRecord.winPct}%`}
              </span>
              <span className="stat-label">Win rate</span>
            </div>
            <div className="stat-block">
              <span className="stat-figure">{late.length}</span>
              <span className="stat-label">{late.length === 1 ? 'Pick' : 'Picks'}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
