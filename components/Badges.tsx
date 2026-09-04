import { badgesOf } from '@/lib/badges'

/** A star with a check inside it — earned and verified, in one mark. */
function FoundingStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45l-5.81 3.05 1.11-6.47L2.6 9.45l6.5-.95L12 2.6z"
        fill="currentColor"
      />
      <polyline
        points="8.6 11.9 11.1 14.3 15.5 9.9"
        fill="none" stroke="#3A2B00" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

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
          {b.tone === 'founder' ? <FoundingStar /> : <span aria-hidden="true">★</span>}
          {full && <span className="badge-label">{b.label}</span>}
        </span>
      ))}
    </span>
  )
}
