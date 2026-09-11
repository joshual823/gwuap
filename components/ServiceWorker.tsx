'use client'
import { useEffect } from 'react'

/**
 * Registers the service worker.
 *
 * Nothing on the site depends on it working — it caches nothing — but
 * two things depend on it existing: Chrome won't offer to install the
 * app without one, and a push notification has nowhere to be delivered
 * without one. Both are the reason the PWA was built at all.
 *
 * Failure is swallowed on purpose. A browser that refuses to register
 * (private mode, an unsupported browser, a corporate policy) should get
 * a site that works exactly as before, not an error.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => { /* site still works */ })
  }, [])
  return null
}
