'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchTickers, isSupportedLeague, type Ticker } from '@/lib/tickers'

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
  value, onChange, league,
}: {
  value: string
  onChange: (v: string) => void
  league: string | null
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  // "$LAL -4.5" -> ticker "LAL", rest "-4.5"
  const body = value.startsWith('$') ? value.slice(1) : value
  const spaceAt = body.indexOf(' ')
  const ticker = spaceAt === -1 ? body : body.slice(0, spaceAt)
  const rest = spaceAt === -1 ? '' : body.slice(spaceAt + 1)
  const stillTypingTicker = spaceAt === -1

  const suggestions = useMemo<Ticker[]>(
    () => (stillTypingTicker ? searchTickers(league, ticker) : []),
    [league, ticker, stillTypingTicker],
  )

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
            ? `No list for ${league} yet — type the cashtag yourself.`
            : 'Choose a league to get team suggestions.'}
        </p>
      )}
    </div>
  )
}
