/**
 * One avatar renderer for the whole app, so a profile picture shows up
 * everywhere rather than only where someone remembered to handle it.
 * Falls back to the gradient placeholder when there's no picture.
 */
export default function Avatar({ url, size = 38, className = '' }: {
  url?: string | null
  size?: number
  className?: string
}) {
  const style = { width: size, height: size }
  if (!url) return <div className={`avatar ${className}`} style={style} />
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
