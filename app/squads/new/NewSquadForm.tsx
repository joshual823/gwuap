'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { slugify, isValidSlug } from '@/lib/squad'

export default function NewSquadForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const slug = slugify(name)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidSlug(slug)) {
      setError('Pick a name with at least two letters or numbers in it.')
      return
    }
    setSaving(true); setError(null)
    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('squads')
      .insert({ slug, name: name.trim(), description: description.trim() || null, owner_id: userId })
      .select('slug')
      .single()
    setSaving(false)
    if (insertError) {
      setError(/duplicate|unique/i.test(insertError.message)
        ? 'That name is taken. Try another.'
        : insertError.message)
      return
    }
    // The owner is enrolled by a trigger, so the room is ready on arrival.
    router.push(`/squads/${data.slug}`)
    router.refresh()
  }

  return (
    <div className="legal">
      <p className="rec-back"><Link href="/squads" className="help-link">← Squads</Link></p>
      <h1 className="page-title">Start a squad</h1>
      <p className="legal-sub">
        A group with its own live room. Anyone signed in can find it and join —
        but only members can read what's said inside.
      </p>

      <form onSubmit={create}>
        <label className="form-label">Name</label>
        <input className="field" value={name} maxLength={40} autoFocus
          placeholder="Sunday Sweats" onChange={e => setName(e.target.value)} required />
        {slug && (
          <p className="field-hint">
            Its address will be <span className="mono">/squads/{slug}</span>
          </p>
        )}

        <label className="form-label" style={{ marginTop: 16 }}>What it's for (optional)</label>
        <textarea className="field" rows={3} maxLength={200} value={description}
          placeholder="Who it's for, and what you talk about."
          onChange={e => setDescription(e.target.value)} />

        <button className="btn" type="submit" disabled={saving || !name.trim()}
          style={{ marginTop: 8 }}>
          {saving ? 'Creating…' : 'Create squad'}
        </button>
        {error && <p style={{ color: 'var(--bear)', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </form>

      <p className="rec-foot">
        You'll be its owner: you can remove messages and members from your own
        room. Five squads a day per account, which is more than anyone needs
        and few enough that the list can't be flooded.
      </p>
    </div>
  )
}
