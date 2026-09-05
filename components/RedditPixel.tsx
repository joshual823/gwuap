'use client'
import Script from 'next/script'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageVisit } from '@/lib/rdt'

/**
 * Reddit's conversion pixel.
 *
 * Inert until NEXT_PUBLIC_REDDIT_PIXEL_ID is set, so nothing
 * third-party loads unless it's deliberately turned on.
 *
 * The same rooms Clarity stays out of. A pixel reports which pages a
 * visitor opened, and "/vent" in an ad network's logs says something
 * about a person that they came to that page precisely to say in
 * private.
 */
const EXCLUDED = ['/vent', '/messages', '/reset']

export default function RedditPixel() {
  const id = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID
  const pathname = usePathname()
  const excluded = EXCLUDED.some(p => pathname?.startsWith(p))

  // The site never reloads between pages, so the snippet's own PageVisit
  // fires once and would report a single visit for a whole session. Every
  // page after the first is reported from here instead.
  //
  // The first one is deliberately skipped rather than sent twice: the
  // snippet below already counted it, and this effect runs at hydration,
  // before afterInteractive has even injected the script — so a call here
  // would find no window.rdt and be dropped anyway.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    if (!id || excluded) return
    trackPageVisit()
  }, [id, pathname, excluded])

  if (!id || excluded) return null

  return (
    <Script id="reddit-pixel" strategy="afterInteractive">
      {`!function(w,d){if(!w.rdt){var p=w.rdt=function(){
        p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};
        p.callQueue=[];var t=d.createElement("script");
        t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=${id}";t.async=!0;
        var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
        rdt('init','${id}');rdt('track','PageVisit');`}
    </Script>
  )
}
