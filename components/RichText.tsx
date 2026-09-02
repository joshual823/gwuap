import Link from 'next/link'

/**
 * Renders @mentions and $cashtags as links. Split with a capturing regex
 * so the surrounding text is preserved exactly — no HTML is constructed
 * from user input, it stays React nodes.
 */
const TOKEN = /(@[A-Za-z0-9_]{3,20}|\$[A-Za-z0-9]{1,24})/g

export default function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN)
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return <Link key={i} href={`/profile/${part.slice(1)}`} className="rt-mention">{part}</Link>
        }
        if (part.startsWith('$')) {
          return <Link key={i} href={`/tag/${part.slice(1).toUpperCase()}`} className="rt-cashtag">{part}</Link>
        }
        return part
      })}
    </p>
  )
}
