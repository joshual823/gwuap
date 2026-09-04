'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchTickers, isSupportedLeague, MAX_TICKER_LENGTH, type Ticker } from '@/lib/tickers'
import { createClient } from '@/lib/supabaseClient'

/**
 * StockTwits-style cashtag field.
 *
 * Forces uppercase, auto-prefixes the "$", and suggests teams as you
 * type. The field holds a ticker plus a free-text line ("$LAL -4.5"), so
 * suggestions only apply to the leading ticker token — once you type a
 * space you're on the line and the dropdown gets out of the way.
 *
 * Suggestions are filtered by the league already chosen on the form,
 * which is what keeps LAC from being ambiguous between the Clippers and
 * the Chargers.
 */
export default function CashtagInput({
  value, onChange, league, categoryId,
}: {
  value: string
  onChange: (v: string) => void
  league: string | null
  /** Scopes learned cashtags to the league, so $CHI in the NHL doesn't surface in the NBA. */
  categoryId?: number | ''
}) {
  const [open, setOpen] = useState(false)
  // Cashtags other people have already used in this league. A fixed list
  // can never cover Challenger tennis, college teams or lower-tier
  // soccer — but anything posted once becomes suggestable forever.
  const [learned, setLearned] = useState<Ticker[]>([])
  // Whoever is actually playing this week. A hand-kept list can't hold a
  // tennis draw or a fight card, and typing a name that isn't in one is
  // how "$TAYLOR TOWNSEND vs $TOWNSEND" got posted.
  const [playing, setPlaying] = useState<Ticker[]>([])
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  // "$LAL -4.5" -> ticker "LAL", rest "-4.5"
  const body = value.startsWith('$') ? value.slice(1) : value
  const spaceAt = body.indexOf(' ')
  const ticker = spaceAt === -1 ? body : body.slice(0, spaceAt)
  const rest = spaceAt === -1 ? '' : body.slice(spaceAt + 1)
  const stillTypingTicker = spaceAt === -1

  const curated = useMemo<Ticker[]>(
    () => (stillTypingTicker ? searchTickers(league, ticker) : []),
    [league, ticker, stillTypingTicker],
  )

  // Whoever is playing comes first — that code is the one the grader
  // will match against. Then the curated list, then anything learned.
  const suggestions = useMemo<Ticker[]>(() => {
    if (!stillTypingTicker) return []
    const seen = new Set<string>()
    const out: Ticker[] = []
    for (const t of [...playing, ...curated, ...learned]) {
      if (seen.has(t.code)) continue
      seen.add(t.code)
      out.push(t)
    }
    return out.slice(0, 8)
  }, [playing, curated, learned, stillTypingTicker])

  useEffect(() => {
    const query = ticker.trim()
    if (!stillTypingTicker || !league) { setPlaying([]); return }
    let cancelled = false
    const timer = setTimeout(() => {
      fetch(`/api/cashtags?league=${encodeURIComponent(league)}&q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          setPlaying((d.tickers ?? []).map((t: any) => ({
            code: t.code, name: t.name, league: league as any,
          })))
        })
        .catch(() => { if (!cancelled) setPlaying([]) })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [league, ticker, stillTypingTicker])

  useEffect(() => {
    const query = ticker.trim()
    if (!stillTypingTicker || query.length < 2 || !categoryId) { setLearned([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('posts')
        .select('ticker')
        .eq('category_id', categoryId)
        .ilike('ticker', `$${query}%`)
        .limit(60)
      if (cancelled) return
      const codes = new Set<string>()
      for (const row of (data ?? []) as { ticker: string | null }[]) {
        if (row.ticker) codes.add(row.ticker.replace(/^\$/, ''))
      }
      setLearned([...codes].sort().slice(0, 8).map(code => ({
        code, name: 'used before', league: (league ?? 'Other') as Ticker['league'],
      })))
    }, 220)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [ticker, stillTypingTicker, categoryId, league])

  useEffect(() => { setHighlight(0) }, [ticker, league])

  // Clicking anywhere else closes the list.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let next = e.target.value.toUpperCase()
    if (next && !next.startsWith('$')) next = '$' + next
    if (next === '$') next = ''
    onChange(next)
    setOpen(true)
  }

  function choose(team: Ticker) {
    // Trailing space moves the user on to the line ("-4.5") and closes the list.
    onChange(rest ? `$${team.code} ${rest}` : `$${team.code} `)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setHighlight(h => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlight(h => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault(); choose(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && suggestions.length > 0

  return (
    <div className="cashtag-wrap" ref={wrapRef}>
      <input
        className="field mono"
        /* Ticker plus a possible spread and a "$": enough room for the
           longest legitimate tag, and short of a pasted sentence. */
        maxLength={MAX_TICKER_LENGTH + 8}
        placeholder="Cashtag, e.g. $LAL -4.5"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls="cashtag-listbox"
        aria-autocomplete="list"
        aria-activedescendant={showList ? `cashtag-opt-${highlight}` : undefined}
      />
      {showList && (
        <ul className="cashtag-list" id="cashtag-listbox" role="listbox">
          {suggestions.map((t, i) => (
            <li
              key={`${t.league}-${t.code}`}
              id={`cashtag-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`cashtag-opt ${i === highlight ? 'active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={e => { e.preventDefault(); choose(t) }}
            >
              <span className="cashtag-code">${t.code}</span>
              <span className="cashtag-name">{t.name}</span>
            </li>
          ))}
        </ul>
      )}
      {!isSupportedLeague(league) && (
        <p className="cashtag-hint">
          {league
            ? `No set list for ${league} — type it once and it'll be suggested next time.`
            : 'Choose a league to get team suggestions.'}
        </p>
      )}
    </div>
  )
}
