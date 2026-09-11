'use client'
import { useEffect, useState } from 'react'

/**
 * Asks people to install the app, once, after they've seen the site.
 *
 * Two signups from a Polymarket group went straight back to the group
 * chat because they wanted an app with push notifications. Installing is
 * the step that turns this into one — and on iOS **push is only
 * available to a home-screen install**, so this banner is the gate in
 * front of every notification the site would ever send.
 *
 * Android fires `beforeinstallprompt` and the browser does the work.
 * **iOS has no such event and never will** — Safari only installs from
 * Share → Add to Home Screen, so the iOS path is instructions rather
 * than a button. Getting this wrong is the classic PWA mistake: a
 * beautiful install button that silently does nothing on half the
 * phones, which is the half that matters for a sports audience.
 */
type Choice = { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISSED = 'gwuap:install-dismissed'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<Choice | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Already installed: standalone display, or iOS's own flag.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return

    try { if (localStorage.getItem(DISMISSED)) return } catch { /* private mode */ }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as unknown as Choice)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS: no event to wait for, so decide from the platform. Only
    // Safari can install — offering this in an in-app browser or Chrome
    // on iOS would be instructions for a menu item that isn't there.
    const ua = window.navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    if (isIos && isSafari) {
      // Same wait as the welcome modal: let them see the site first.
      const t = setTimeout(() => { setIosHint(true); setShow(true) }, 20_000)
      return () => { window.removeEventListener('beforeinstallprompt', onPrompt); clearTimeout(t) }
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISSED, '1') } catch { /* private mode */ }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="install-bar" role="region" aria-label="Install Gwuap">
      <div className="install-copy">
        <strong>Add Gwuap to your home screen</strong>
        <span>
          {iosHint
            ? 'Tap Share, then “Add to Home Screen”.'
            : 'Opens like an app, and it’s how notifications reach you.'}
        </span>
      </div>
      {!iosHint && (
        <button type="button" className="btn" onClick={install}>Install</button>
      )}
      <button type="button" className="install-x" onClick={dismiss} aria-label="Not now">✕</button>
    </div>
  )
}
