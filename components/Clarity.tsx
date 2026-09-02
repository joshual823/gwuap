'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

/**
 * Microsoft Clarity — heatmaps and session recordings, free.
 *
 * Inert until NEXT_PUBLIC_CLARITY_ID is set, so nothing third-party
 * loads unless you deliberately turn it on.
 *
 * The Vent room is excluded. Clarity records what people do on a page,
 * and Vent is where someone types about a gambling problem at 3am.
 * Recording that is not something to do by accident, and "we mask the
 * text" isn't good enough when the safer option is to not record the
 * page at all.
 */
const EXCLUDED = ['/vent', '/messages', '/reset']

export default function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID
  const pathname = usePathname()
  if (!id) return null
  if (EXCLUDED.some(p => pathname?.startsWith(p))) return null

  return (
    <Script id="clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${id}");`}
    </Script>
  )
}
