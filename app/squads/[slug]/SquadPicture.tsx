'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { uploadAvatar } from '@/lib/uploadAvatar'
import Avatar from '@/components/Avatar'

/**
 * The squad's picture, for the owner only.
 *
 * Resized in the browser before it leaves, the same as a profile
 * picture: a phone photo is four megabytes and a 42px circle needs
 * none of it.
 */
export default function SquadPicture({ squadId, name, url, canEdit }: {
  squadId: string
  name: string
  url: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError(null)
    try {
      const result = await uploadAvatar(file, { squadId })
      if ('error' in result) throw new Error(result.error)

      const supabase = createClient()
      const { error: saveError } = await supabase
        .from('squads').update({ avatar_url: result.url }).eq('id', squadId)
      if (saveError) throw new Error(saveError.message)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set that picture.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  if (!canEdit) return <Avatar url={url} size={46} name={name} />

  return (
    <span className="squad-pic">
      <button type="button" className="squad-pic-btn" disabled={busy}
        onClick={() => input.current?.click()}
        title="Change the squad picture">
        <Avatar url={url} size={46} name={name} />
        <span className="squad-pic-edit">{busy ? '…' : 'Edit'}</span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={upload} />
      {error && <span style={{ color: 'var(--bear)', fontSize: 12 }}>{error}</span>}
    </span>
  )
}
