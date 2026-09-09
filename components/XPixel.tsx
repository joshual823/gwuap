'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

/**
 * X's conversion pixel.
 *
 * Inert until NEXT_PUBLIC_X_PIXEL_ID is set, so nothing third-party
 * loads unless it's deliberately turned on.
 *
 * The same rooms Clarity and the Reddit pixel stay out of. A pixel
 * reports which pages a visitor opened, and "/vent" in an ad network's
 * logs says something about a person that they came to that page
 * precisely to say in private.
 *
 * Unlike the Reddit pixel there's no per-route call here. `twq('config')`
 * reports the page view it loads on, and X's tag has no documented
 * equivalent of re-firing PageVisit on a client-side navigation — so
 * rather than invent one, this reports the entry page and leaves the
 * conversion event to do the work that a Conversions campaign actually
 * optimises against. Check it in Ads Manager → Conversion Diagnostics
 * rather than assuming.
 */
const EXCLUDED = ['/vent', '/messages', '/reset']

export default function XPixel() {
  const id = process.env.NEXT_PUBLIC_X_PIXEL_ID
  const pathname = usePathname()
  const excluded = EXCLUDED.some(p => pathname?.startsWith(p))

  if (!id || excluded) return null

  return (
    <Script id="x-pixel" strategy="afterInteractive">
      {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){
        s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},
        s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,
        u.src='https://static.ads-twitter.com/uwt.js',
        a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))
        }(window,document,'script');
        twq('config','${id}');`}
    </Script>
  )
}
