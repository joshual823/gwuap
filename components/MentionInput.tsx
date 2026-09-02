'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { searchTickers, TICKERS } from '@/lib/tickers'

type Suggestion = { insert: string; label: string; detail: string }

/**
 * A textarea that completes @usernames and $cashtags as you type.
 *
 * The trigger is the token immediately before the caret, so it only
 * fires where you're actually typing — not on an @ from earlier in the
 * message. People are matched from the database; cashtags come from the
 * curated ticker list first, then anything already posted, so the long
 * tail a fixed list can't cover still completes.
 */
export default function MentionInput({
  value, onChange, placeholder, rows = 3, maxLength, className = 'field', autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  className?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [items, setItems] = useState<Suggestion[]>([])
  const [highlight, setHighlight] = useState(0)
  const [token, setToken] = useState<{ kind: '@' | '$'; query: string; start: number } | null>(null)

  /** The @… or $… being typed at the caret, if any. */
  function tokenAtCaret(text: string, caret: number) {
    const before = text.slice(0, caret)
    const match = /(^|\s)([@$])([A-Za-z0-9_]*)$/.exec(before)
    if (!match) return null
    return {
      kind: match[2] as '@' | '$',
      query: match[3],
      start: caret - match[3].length - 1,
    }
  }

  useEffect(() => {
    if (!token) { setItems([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      const q = token.query
      if (token.kind === '@') {
        if (q.length < 1) { setItems([]); return }
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('username, display_name')
          .ilike('username', `${q}%`)
          .eq('is_banned', false)
          .limit(6)
        if (cancelled) return
        setItems((data ?? []).map((u: any) => ({
          insert: `@${u.username}`, label: `@${u.username}`, detail: u.display_name ?? '',
        })))
      } else {
        // Curated tickers across every league, then anything posted before.
        const curated = q
          ? TICKERS.filter(t => t.code.startsWith(q.toUpperCase())).slice(0, 5)
          : []
        const seen = new Set(curated.map(t => t.code))
        const base: Suggestion[] = curated.map(t => ({
          insert: `$${t.code}`, label: `$${t.code}`, detail: t.name,
        }))
        if (q.length >= 2) {
          const supabase = createClient()
          const { data } = await supabase
            .from('posts').select('ticker').ilike('ticker', `$${q}%`).limit(40)
          if (cancelled) return
          for (const row of (data ?? []) as { ticker: string | null }[]) {
            const code = row.ticker?.replace(/^\$/, '')
            if (code && !seen.has(code)) {
              seen.add(code)
              base.push({ insert: `$${code}`, label: `$${code}`, detail: 'used before' })
            }
          }
        }
        if (!cancelled) setItems(base.slice(0, 6))
      }
    }, 160)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [token])

  useEffect(() => { setHighlight(0) }, [items.length])

  function sync(el: HTMLTextAreaElement) {
    setToken(tokenAtCaret(el.value, el.selectionStart ?? el.value.length))
  }

  function choose(item: Suggestion) {
    const el = ref.current
    if (!el || !token) return
    const caret = el.selectionStart ?? value.length
    const next = value.slice(0, token.start) + item.insert + ' ' + value.slice(caret)
    onChange(next)
    setToken(null)
    setItems([])
    requestAnimationFrame(() => {
      const at = token.start + item.insert.length + 1
      el.focus()
      el.setSelectionRange(at, at)
    })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (items.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % items.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => (h - 1 + items.length) % items.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(items[highlight]) }
    else if (e.key === 'Escape') { setToken(null); setItems([]) }
  }

  return (
    <div className="mention-wrap">
      <textarea
        ref={ref}
        className={className}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={e => { onChange(e.target.value); sync(e.target) }}
        onKeyUp={e => sync(e.currentTarget)}
        onClick={e => sync(e.currentTarget)}
        onBlur={() => setTimeout(() => { setToken(null); setItems([]) }, 120)}
        onKeyDown={onKeyDown}
      />
      {items.length > 0 && (
        <ul className="mention-list" role="listbox">
          {items.map((item, i) => (
            <li key={item.insert}
              role="option"
              aria-selected={i === highlight}
              className={`mention-opt ${i === highlight ? 'active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={e => { e.preventDefault(); choose(item) }}>
              <span className="mention-label">{item.label}</span>
              {item.detail && <span className="mention-detail">{item.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
