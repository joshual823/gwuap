'use client'
import { useEffect, useState } from 'react'

type Choice = 'system' | 'light' | 'dark'
const KEY = 'gwuap:theme'

/**
 * System / Light / Dark. "System" is the default and removes the
 * attribute entirely, so the OS preference wins — most people never
 * touch this, and the right default is the one their phone already has.
 */
export default function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>('system')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Choice | null
      if (saved === 'light' || saved === 'dark') setChoice(saved)
    } catch { /* private mode */ }
  }, [])

  function apply(next: Choice) {
    setChoice(next)
    const root = document.documentElement
    if (next === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', next)
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch { /* private mode */ }
  }

  return (
    <div className="theme-toggle">
      <span className="form-label" style={{ margin: 0 }}>Appearance</span>
      <div className="segment compact">
        {(['system', 'light', 'dark'] as Choice[]).map(c => (
          <button key={c} type="button" aria-pressed={choice === c}
            className={choice === c ? 'active' : ''}
            onClick={() => apply(c)}>
            {c === 'system' ? 'Auto' : c === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>
    </div>
  )
}
