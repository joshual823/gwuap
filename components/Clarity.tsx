import Script from 'next/script'

/**
 * Microsoft Clarity — heatmaps and session recordings, free.
 *
 * Inert until NEXT_PUBLIC_CLARITY_ID is set, so nothing third-party
 * loads unless you deliberately turn it on.
 *
 * **Loads with `beforeInteractive`, i.e. from the initial HTML.** It used
 * to be `afterInteractive`, which injects the tag only once React has
 * hydrated. That is fine for someone browsing and wrong for the traffic
 * we actually buy: a visitor who lands from an ad and leaves in two
 * seconds can be gone before hydration finishes, and Clarity never
 * starts. Ad clicks are exactly the sessions worth recording, so the tag
 * has to be there before the page is interactive. Microsoft's own
 * instructions say put it in <head> for the same reason.
 *
 * That forces this to be a server component: `beforeInteractive` is
 * injected server-side and must sit in the root layout, so it can't
 * depend on a client hook. The route exclusion below therefore moved
 * from `usePathname()` into the script itself, which reads
 * `location.pathname` before deciding to initialise.
 *
 * The Vent room is excluded. Clarity records what people do on a page,
 * and Vent is where someone types about a gambling problem at 3am.
 * Recording that is not something to do by accident, and "we mask the
 * text" isn't good enough when the safer option is to not record the
 * page at all.
 *
 * **Known limit, unchanged by this rewrite:** the check runs once, on
 * load. Someone who opens /feed and then navigates to /vent client-side
 * is still being recorded, because Clarity is already running by then
 * and unmounting a <Script> doesn't unload it. That was true of the
 * `usePathname` version too. Stopping it properly needs a
 * `clarity('stop')` call on route change, which is worth doing and is
 * not this change.
 */
const EXCLUDED = ['/vent', '/messages', '/reset']

export default function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID
  if (!id) return null

  return (
    <Script id="clarity" strategy="beforeInteractive">
      {`(function(c,l,a,r,i,t,y){
        var excluded = ${JSON.stringify(EXCLUDED)};
        for (var n = 0; n < excluded.length; n++) {
          if (l.location.pathname.indexOf(excluded[n]) === 0) return;
        }
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${id}");`}
    </Script>
  )
}
