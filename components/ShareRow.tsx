'use client'
import { useState } from 'react'

/**
 * Sharing anything with a link.
 *
 * Extracted from the squad invite, which had the same five targets
 * hardcoded — a second copy would have drifted the first time one of
 * these changed its URL scheme.
 */
export default function ShareRow({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* a browser that refuses the clipboard leaves the link visible anyway */ }
  }

  async function nativeShare() {
    try { await navigator.share({ text, url }) }
    catch { /* dismissing the sheet isn't an error */ }
  }

  return (
    <div className="share-row">
      <button type="button" className="share-btn" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <a className="share-btn" target="_blank" rel="noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>WhatsApp</a>
      <a className="share-btn" target="_blank" rel="noreferrer"
        href={`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}>X</a>
      <a className="share-btn" target="_blank" rel="noreferrer"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a>
      <a className="share-btn" target="_blank" rel="noreferrer"
        href={`sms:?&body=${encodeURIComponent(`${text} ${url}`)}`}>Message</a>
      <button type="button" className="share-btn" onClick={nativeShare}>More…</button>
    </div>
  )
}
