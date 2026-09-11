'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

/**
 * PostHog — session replay, heatmaps and funnels. Free tier, one script.
 *
 * Replaces Microsoft Clarity, which was installed for nine days and never
 * recorded a single session. Two separate Clarity projects, a desktop
 * browser and a phone all produced the same nothing: the tag fetched with
 * a 200 and never once POSTed to `/collect`. Nothing on our side was
 * blocking it — no CSP, and the Reddit and X pixels set cookies from the
 * same page loads — and after eliminating the domain, IP blocking, the
 * consent gate and the load timing there was no further test left to run.
 * Replacing it was cheaper than another round of guessing.
 *
 * Inert until NEXT_PUBLIC_POSTHOG_KEY is set, so nothing third-party
 * loads unless you deliberately turn it on.
 *
 * **The funnel is the reason this is here, more than the heatmaps.** The
 * open question is where people go between landing and not signing up,
 * and that's a funnel question. Clarity never answered it and Vercel
 * Analytics can't.
 */
export const POSTHOG_EXCLUDED = ['/vent', '/messages', '/reset']

export default function PostHogTracker() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const optedOut = useRef(false)
  const started = useRef(false)

  const excluded = POSTHOG_EXCLUDED.some(p => pathname?.startsWith(p))

  useEffect(() => {
    if (!key || started.current) return
    // Never start on an excluded page: the load-time guard, same as the
    // one Clarity had. The route guard below covers navigation.
    if (POSTHOG_EXCLUDED.some(p => window.location.pathname.startsWith(p))) return

    posthog.init(key, {
      api_host: host,
      // Pageviews are captured below instead, because the App Router
      // doesn't do a document load per navigation and the automatic one
      // would miss every soft route change.
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        // Whatever somebody types is theirs. A replay is for seeing where
        // a layout loses people, not for reading their password or their
        // take before they post it.
        maskAllInputs: true,
      },
      persistence: 'localStorage+cookie',
    })
    started.current = true
  }, [key, host])

  /**
   * The Vent room stays out of analytics entirely.
   *
   * Vent is where somebody types about a gambling problem at 3am.
   * Recording that is not something to do by accident, and "we mask the
   * inputs" isn't good enough when not recording the page at all is
   * available. Messages and password resets go the same way.
   *
   * Opting out rather than unmounting, because tearing down a component
   * doesn't stop a recorder that's already running — the mistake the
   * Clarity version shipped with and had to be fixed afterwards.
   */
  useEffect(() => {
    if (!key || !started.current) return
    if (excluded && !optedOut.current) {
      posthog.stopSessionRecording()
      posthog.opt_out_capturing()
      optedOut.current = true
    } else if (!excluded && optedOut.current) {
      posthog.opt_in_capturing()
      posthog.startSessionRecording()
      optedOut.current = false
    }
  }, [excluded, key])

  useEffect(() => {
    if (!key || !started.current || excluded) return
    const qs = searchParams?.toString()
    posthog.capture('$pageview', {
      $current_url: window.location.origin + pathname + (qs ? `?${qs}` : ''),
    })
  }, [pathname, searchParams, excluded, key])

  return null
}
