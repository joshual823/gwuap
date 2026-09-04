import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchGameDetail, fetchGamesWindow, postHrefForGame, postHrefForMarket, kickoff, LEAGUES_WITH_SCORES } from '@/lib/scores'
import LiveRefresh from './LiveRefresh'
import GameChat from './GameChat'
import GameTabs from './GameTabs'
import WatchButton from '@/components/WatchButton'
import { createClient } from '@/lib/supabaseServer'
import { projectPick } from '@/lib/grade'
import { profitForStatus, formatSignedUsd, labelFor, type Direction } from '@/lib/odds'

export const dynamic = 'force-dynamic'

export default async function GamePage(props: {
  params: Promise<{ league: string; id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await props.params
  const search = await props.searchParams
  const tab = search.tab === 'chat' ? 'chat' : 'game'
  const league = decodeURIComponent(params.league)
  if (!LEAGUES_WITH_SCORES.includes(league)) notFound()

  const detail = await fetchGameDetail(league, params.id)
  if (!detail) notFound()

  // The pick link needs the scoreboard's view of the game (it carries the
  // line), so find it there rather than rebuilding it from the summary.
  // The same window the league pages use. Looking only at today's
  // scoreboard meant any game further out was found by the list that
  // linked here and not by this page — so it rendered with no way to
  // post on it, which is the one thing the page is for.
  const game = (await fetchGamesWindow(league, 3, 10)).find(g => g.id === params.id)

  const live = detail.state === 'in'
  const start = kickoff(game?.startsAt ?? null)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: watchRows } = user
    ? await supabase.from('watchlist').select('ticker').eq('user_id', user.id)
    : { data: [] }
  const watchedCodes = (watchRows ?? []).map((w: any) => String(w.ticker).toUpperCase())
  const gameKey = `${league}:${params.id}`

  // Your own picks on this game, and where they stand right now.
  // The point of this page is that you shouldn't have to open a
  // sportsbook to find out whether you're up.
  const { data: myPicks } = user
    ? await supabase
        .from('posts')
        .select('id, tag, tag2, bet_type, sentiment, ticker, line, odds, stake, status, profit')
        .eq('author_id', user.id)
        .eq('game_id', params.id)
        .eq('game_league', league)
        .eq('post_kind', 'pick')
        .order('created_at', { ascending: false })
    : { data: null }

  const positions = (myPicks ?? []).map((p: any) => {
    const projected = game
      ? projectPick({
          betType: p.bet_type, sentiment: p.sentiment,
          ticker: p.ticker, line: p.line == null ? null : Number(p.line),
        }, game)
      : null
    const settled = p.status !== 'pending'
    const outcome = settled ? p.status : projected
    return {
      ...p,
      outcome,
      settled,
      money: p.profit ?? (outcome ? profitForStatus(outcome, p.odds, p.stake) : null),
    }
  })

  // How busy the room is. A tab that says "Chat" tells you nothing about
  // whether anyone is in there, which is most of why nobody opens it.
  const { count: chatCount } = await supabase
    .from('game_messages')
    .select('*', { count: 'exact', head: true })
    .eq('game_key', gameKey)
  const base = `/game/${encodeURIComponent(league)}/${encodeURIComponent(params.id)}`

  return (
    <div style={{ marginTop: 16 }}>
      <LiveRefresh active={live} />
      <Link href={`/scores/${encodeURIComponent(league)}`} className="back-link">← {league}</Link>

      <div className={`gd-head lg-${league.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
        <span className="game-league">{league}</span>
        {/* The state of the game is the first thing anyone needs and used
            to be the faintest thing here — grey, small, indistinguishable
            from the venue. It's a badge now. */}
        <span className={`gd-state-badge ${detail.state}`}>
          {live && <span className="live-dot" />}
          {detail.state === 'post' ? 'FINAL' : detail.state === 'in' ? 'LIVE' : 'UPCOMING'}
        </span>
        {/* The summary endpoint says "Scheduled", which tells nobody
            anything. The scoreboard row carries the actual timestamp. */}
        {detail.state === 'pre' && start
          ? <span className="gd-when"><strong>{start.time}</strong> {start.day}</span>
          : detail.state !== 'post' && <span className="gd-when">{detail.status}</span>}
        <WatchButton ticker={gameKey} league={league} kind="game" viewerId={user?.id ?? null}
          initiallyWatched={watchedCodes.includes(gameKey.toUpperCase())} label />
      </div>

      <GameTabs
        initial={tab}
        base={base}
        chatCount={chatCount ?? 0}
        game={<>
      {/* Your own money on this game. Sits above the box score because
          it's the reason you opened the page. */}
      {positions.length > 0 && (
        <div className="position-card">
          <div className="position-head">
            <span>Your {positions.length === 1 ? 'pick' : 'picks'}</span>
            {!detail.state.startsWith('post') && positions.some(p => !p.settled) && (
              <span className="position-live">as it stands</span>
            )}
          </div>
          {positions.map((p: any) => (
            <div className="position-row" key={p.id}>
              <div className="position-what">
                <span className="cashtag">{p.tag}</span>
                {/* Any bet that turns on a number shows it. A spread
                    already carries its own inside the tag. */}
                <span className="position-dir">
                  {labelFor(p.sentiment as Direction, p.bet_type)}
                  {p.line != null && p.bet_type !== 'spread' ? ` ${p.line}` : ''}
                </span>
                <span className="position-terms">{p.odds}{p.stake != null && ` · $${p.stake}`}</span>
              </div>
              <div className="position-state">
                {p.outcome ? (
                  <>
                    <span className={`position-result ${p.outcome}`}>
                      {p.settled ? p.outcome.toUpperCase()
                        : p.outcome === 'win' ? 'WINNING'
                        : p.outcome === 'loss' ? 'LOSING' : 'PUSH'}
                    </span>
                    {p.money != null && (
                      <span className={`position-money ${p.money >= 0 ? 'pos' : 'neg'}`}>
                        {formatSignedUsd(p.money)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="position-result pending">No score yet</span>
                )}
              </div>
            </div>
          ))}
          {!positions.every(p => p.settled) && (
            <p className="position-note">
              Settles itself from the final score — nothing to do.
            </p>
          )}
        </div>
      )}


      <table className="gd-box">
        <thead>
          <tr>
            <th />
            {detail.periods.map(p => <th key={p}>{p}</th>)}
            <th className="gd-total">T</th>
          </tr>
        </thead>
        <tbody>
          {detail.sides.map(side => (
            <tr key={side.code}>
              <td className="gd-team">
                {side.logo && <img src={side.logo} alt="" className="gd-logo" loading="lazy" />}
                {side.label ?? side.code}
                {side.record && <span className="gd-record">{side.record}</span>}
                <WatchButton ticker={side.code} league={league} viewerId={user?.id ?? null}
                  initiallyWatched={watchedCodes.includes(side.code.toUpperCase())} />
              </td>
              {detail.periods.map((p, i) => <td key={p}>{side.byPeriod[i] ?? '–'}</td>)}
              <td className="gd-total">{side.score ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail.lastPlay && (
        <p className="gd-lastplay"><strong>Last play</strong> {detail.lastPlay}</p>
      )}

      {detail.summary && (
        <p className="gd-lastplay"><strong>Result</strong> {detail.summary}</p>
      )}

      {(detail.odds.length > 0 || detail.venue || detail.broadcast) && (
        <div className="gd-facts">
          {detail.odds.map(o => (
            <span key={o.label}><span className="gd-k">{o.label}</span> {o.value}</span>
          ))}
          {detail.broadcast && <span><span className="gd-k">TV</span> {detail.broadcast}</span>}
          {detail.venue && <span><span className="gd-k">At</span> {detail.venue}</span>}
        </div>
      )}

      {/* Real prices, tapped rather than typed. The whole reason this is
          here instead of a blank odds field is that a pick posted from a
          market is a selection with a provenance, while a typed one is a
          claim — and only one of those is worth putting on a leaderboard. */}
      {game && (game.markets?.length ?? 0) > 0 && (
        <div className="markets">
          <div className="markets-head">
            <span>Post a pick</span>
            {game.book && <span className="markets-book">odds from {game.book}</span>}
          </div>
          {(['moneyline', 'spread', 'total'] as const).map(kind => {
            const row = game.markets!.filter(m => m.kind === kind)
            if (row.length === 0) return null
            return (
              <div className="market-row" key={kind}>
                <span className="market-kind">
                  {kind === 'moneyline' ? 'Moneyline' : kind === 'spread' ? 'Spread' : 'Total'}
                </span>
                {row.map(m => (
                  <Link key={`${m.kind}-${m.side}`} href={postHrefForMarket(game, m)} className="market-btn">
                    <span className="market-pick">{m.label}</span>
                    <span className="market-odds">{m.odds}</span>
                  </Link>
                ))}
              </div>
            )
          })}
          <Link href={postHrefForGame(game)} className="market-custom">
            Something else — post a custom pick
          </Link>
        </div>
      )}

      {game && (game.markets?.length ?? 0) === 0 && (
        <Link href={postHrefForGame(game)} className="btn gd-post">
          Post a pick on this game
        </Link>
      )}

      {live && (
        <p className="gd-note">Updating every 30 seconds while the game is on.</p>
      )}
        </>}
        chat={<>
          <div className="gc-score">
            {detail.sides.map((side, n) => (
              <div className="gc-score-side" key={n}>
                {side.logo && <img src={side.logo} alt="" className="gc-logo" loading="lazy" />}
                <span className="gc-code">{side.code}</span>
                <span className="gc-num">{side.score ?? '–'}</span>
              </div>
            ))}
            <span className={`gc-state ${detail.state}`}>
              {live && <span className="live-dot" />}{detail.status}
            </span>
          </div>
          {detail.lastPlay && (
            <div className="gc-play">
              {detail.lastPlayKind && <strong>{detail.lastPlayKind}</strong>}
              <span>{detail.lastPlay}</span>
            </div>
          )}
          <GameChat gameKey={`${league}:${params.id}`} viewerId={user?.id ?? null} />
        </>}
      />
    </div>
  )
}
