'use client'
import { useState } from 'react'
import { SITE_URL } from '@/lib/brand'
import { ShareIcon, CheckIcon } from './icons'

/**
 * Share a post out of the site.
 *
 * navigator.share opens the real OS sheet on a phone — Messages,
 * WhatsApp, X, whatever they actually use — which is the only version
 * of this anyone taps. Desktop browsers mostly don't have it, so the
 * fallback copies the link and says so.
 *
 * Deliberately not inside the ⋯ menu: that menu is hidden from logged-out
 * visitors, and sharing is how people arrive rather than something you
 * do once you've joined.
 */
export default function ShareButton({ postId, summary }: {
  postId: string
  summary: string
}) {
  const [copied, setCopied] = useState(false)
  const url = `${SITE_URL}/post/${postId}`

  async function share() {
    // A cancelled share sheet rejects, which is not an error — the person
    // simply changed their mind, and showing "copied" would be a lie.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Gwuap', text: summary, url })
        return
      } catch {
        return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard needs permission and a secure context; if it's refused,
      // say nothing rather than claim success.
    }
  }

  return (
    <button type="button" className="action-btn" onClick={share}
      aria-label="Share this post">
      {copied ? <CheckIcon /> : <ShareIcon />}
      {copied && <span>Copied</span>}
    </button>
  )
}
