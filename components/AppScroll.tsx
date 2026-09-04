'use client'
import { useRef } from 'react'
import PullToRefresh from './PullToRefresh'

/** The scrolling half of the app shell, with the pull gesture attached. */
export default function AppScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  return (
    <main className="scroll" ref={ref}>
      <PullToRefresh target={ref} />
      {children}
    </main>
  )
}
