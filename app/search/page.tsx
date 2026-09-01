'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

type Person = { id: string; username: string; display_name: string | null }
type Pick = { id: string; tag: string | null; caption: string | null; sentiment: string; author: { username: string } | null }

export default function SearchPage() {
  const supabase = createClient()
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [searched, setSearched] = useState(false)

  async function search(value: string) {
    setQ(value)
    const term = value.trim()
    if (!term) { setPeople([]); setPicks([]); setSearched(false); return }

    // Cashtags are how this site is organised, so searching "$LAL" or
    // "LAL" has to find picks, not just come back empty.
    const bare = term.replace(/^\$/, '')
    const [{ data: profileRows }, { data: postRows }] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, display_name')
        .ilike('username', `%${bare}%`)
        .eq('is_banned', false)
        .limit(10),
      supabase.from('posts')
        .select('id, tag, caption, sentiment, author:profiles!posts_author_id_fkey ( username )')
        .ilike('tag', `%${bare}%`)
        .order('created_at', { ascending: false })
        .limit(15),
    ])
    setPeople((profileRows ?? []) as Person[])
    setPicks((postRows ?? []) as any)
    setSearched(true)
  }

  const nothing = searched && people.length === 0 && picks.length === 0

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 16 }}>Search</h1>
      <input className="field" placeholder="A username, or a cashtag like $LAL…" value={q}
        onChange={e => search(e.target.value)} autoFocus autoCapitalize="none" />

      {!searched && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
          Search people by username, or picks by cashtag.
        </p>
      )}

      {nothing && (
        <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginTop: 8 }}>
          Nothing for “{q}”. Try a different username or cashtag.
        </p>
      )}

      {people.length > 0 && <h2 className="comments-heading">People</h2>}
      {people.map(u => (
        <Link href={`/profile/${u.username}`} key={u.id} className="search-row">
          <div className="avatar" style={{ width: 32, height: 32 }} />
          <div>
            <div style={{ fontWeight: 600 }}>@{u.username}</div>
            {u.display_name && <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{u.display_name}</div>}
          </div>
        </Link>
      ))}

      {picks.length > 0 && <h2 className="comments-heading">Picks</h2>}
      {picks.map(p => (
        <Link href={`/post/${p.id}`} key={p.id} className="search-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
              {p.tag && <span className="cashtag">{p.tag}</span>}
              <span className={`sentiment ${p.sentiment}`}>{p.sentiment}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{p.author?.username}{p.caption ? ` · ${p.caption}` : ''}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
