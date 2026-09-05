/**
 * One avatar renderer for the whole app, so a profile picture shows up
 * everywhere rather than only where someone remembered to handle it.
 *
 * With no picture it draws initials on a colour derived from the name,
 * rather than the blank grey circle it used to. Three of the first four
 * accounts had no picture, and a feed of identical empty circles reads
 * as broken rather than as unset — and worse, makes people
 * indistinguishable, which is the one job an avatar has.
 *
 * The brand mark was the other option and would have been worse for the
 * same reason: every account wearing the same logo tells you nothing
 * about who wrote what.
 */
const PALETTE = [
  '#1D9BF0', '#00A87E', '#7C5CFF', '#E0524A',
  '#C4761A', '#D6478E', '#2E8B57', '#4B6BDB',
]

/** Same name, same colour, forever — and without storing anything. */
function colourFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function initialsFor(name: string): string {
  const clean = name.replace(/^@/, '').trim()
  if (!clean) return '?'
  // Letters read better than the digits people tack onto a handle:
  // "jbreezy823" is J, not 8.
  const letters = clean.replace(/[^a-zA-Z]/g, '')
  return (letters[0] ?? clean[0]).toUpperCase()
}

export default function Avatar({ url, size = 38, name, className = '' }: {
  url?: string | null
  size?: number
  /** Username or display name. Without it, the old blank circle. */
  name?: string | null
  className?: string
}) {
  const style = { width: size, height: size }

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`avatar ${className}`}
        style={{ ...style, objectFit: 'cover' }}
      />
    )
  }

  if (!name) return <div className={`avatar ${className}`} style={style} />

  return (
    <div
      className={`avatar avatar-initial ${className}`}
      aria-hidden="true"
      style={{
        ...style,
        background: colourFor(name),
        // Scales with the circle so it reads at 20px and at 72px.
        fontSize: Math.max(10, Math.round(size * 0.44)),
      }}
    >
      {initialsFor(name)}
    </div>
  )
}
