'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

export default function SearchPage() {
  const supabase = createClient()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])

  async function search(value: string) {
    setQ(value)
    if (!value.trim()) { setResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${value}%`)
      .eq('is_banned', false)
      .limit(20)
    setResults(data ?? [])
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 16 }}>Search users</h1>
      <input className="field" placeholder="Search by username…" value={q}
        onChange={e => search(e.target.value)} autoFocus />
      <div>
        {results.map(u => (
          <Link href={`/profile/${u.username}`} key={u.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--line)' }} />
            <div>
              <div style={{ fontWeight: 600 }}>@{u.username}</div>
              {u.display_name && <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{u.display_name}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
