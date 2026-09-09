/**
 * The interface icons, as outlines.
 *
 * They were emoji, which is why the top bar and the tab bar never quite
 * looked like the apps they sit next to: emoji are somebody else's
 * artwork, in somebody else's colours, at whatever weight the OS ships —
 * and they render differently on every device, so the bar is a different
 * bar on Android.
 *
 * These are stroked paths with no fill, taking their colour from
 * `currentColor`. That's the whole trick behind the look on X, Instagram
 * and Polymarket: one weight, see-through, and the active state is just
 * a colour change on the same shape rather than a second icon.
 *
 * Geometry is Feather (MIT), which is where that weight comes from.
 */
export type IconName =
  | 'home' | 'star' | 'plus' | 'users' | 'user'
  | 'bell' | 'send' | 'search' | 'trophy' | 'shield'

const PATHS: Record<IconName, React.ReactNode> = {
  home: <>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  plus: <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
  users: <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
  user: <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
  bell: <>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </>,
  // The paper plane, which is what a direct message looks like in every
  // app people already use. An envelope reads as email.
  send: <>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </>,
  search: <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
  trophy: <>
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
}

export default function Icon({ name, size = 22, strokeWidth = 1.7, className }: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      // Decorative: every one of these sits inside a link that already
      // has a title or a visible label, so a second name for the same
      // thing would just be read out twice.
      aria-hidden="true" focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
