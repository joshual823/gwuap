import { badgesOf } from '@/lib/badges'

/** Compact by default; `full` spells the label out on a profile. */
export default function Badges({ badges, full = false }: {
  badges: unknown
  full?: boolean
}) {
  const list = badgesOf(badges)
  if (list.length === 0) return null

  return (
    <span className="badges">
      {list.map(b => (
        <span key={b.id} className={`badge badge-${b.tone}`} title={b.title}>
          {b.tone === 'champion' ? '★' : '◆'}
          {full && <span className="badge-label">{b.label}</span>}
        </span>
      ))}
    </span>
  )
}
