'use client'
import { useEffect, useRef, useState } from 'react'

const ITEM_HEIGHT = 40
const BUFFER = 8 // extra rows rendered above/below the visible window

// A virtualized scroll-and-snap number picker, plus a type-in box above it
// for jumping straight to a value. Virtualized because ranges here can run
// into the hundreds of thousands of steps (e.g. stake up to $1,000,000) —
// rendering every possible number as a real DOM element would crash the
// browser, so only the numbers near the current scroll position are ever
// actually rendered.
export default function ScrollPicker({
  min, max, step = 1, value, onChange, suffix = '',
}: { min: number; max: number; step?: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const count = Math.floor((max - min) / step) + 1
  const totalHeight = count * ITEM_HEIGHT
  const [range, setRange] = useState({ start: 0, end: Math.min(count, BUFFER * 2) })
  const [manualInput, setManualInput] = useState(String(value))

  // Guards against the browser's own scroll-snap "settling" animation —
  // triggered whenever we jump scrollTop programmatically — from being
  // misread as a real user scroll and re-triggering onChange in a loop.
  const suppressRef = useRef(false)

  function valueAt(idx: number) { return min + idx * step }
  function idxOf(v: number) { return Math.min(Math.max(Math.round((v - min) / step), 0), count - 1) }

  function updateRangeFromScrollTop(scrollTop: number) {
    const centerIdx = Math.round(scrollTop / ITEM_HEIGHT)
    setRange({ start: Math.max(0, centerIdx - BUFFER), end: Math.min(count, centerIdx + BUFFER) })
  }

  // Jump the wheel to a value without fighting the browser's scroll-snap animation.
  function jumpTo(idx: number) {
    const el = containerRef.current
    if (!el) return
    suppressRef.current = true
    el.style.scrollSnapType = 'none'
    el.scrollTop = idx * ITEM_HEIGHT
    updateRangeFromScrollTop(el.scrollTop)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el) el.style.scrollSnapType = 'y mandatory'
        setTimeout(() => { suppressRef.current = false }, 150)
      })
    })
  }

  useEffect(() => {
    setManualInput(String(value))
    jumpTo(idxOf(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let scrollTimeout: ReturnType<typeof setTimeout>
  function handleScroll() {
    if (!containerRef.current) return
    updateRangeFromScrollTop(containerRef.current.scrollTop)
    if (suppressRef.current) return
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      if (!containerRef.current || suppressRef.current) return
      const idx = idxOf(min + Math.round(containerRef.current.scrollTop / ITEM_HEIGHT) * step)
      const newVal = valueAt(idx)
      if (newVal !== value) { onChange(newVal); setManualInput(String(newVal)) }
    }, 100)
  }

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    setManualInput(e.target.value.replace(/[^0-9]/g, ''))
  }

  function commitManual() {
    let n = parseInt(manualInput || String(min), 10)
    if (isNaN(n)) n = min
    n = Math.min(Math.max(n, min), max)
    n = min + Math.round((n - min) / step) * step // snap to the nearest valid step
    setManualInput(String(n))
    onChange(n)
    jumpTo(idxOf(n))
  }

  const items = []
  for (let i = range.start; i < range.end; i++) {
    items.push(
      <div key={i} className={`scroll-picker-item ${valueAt(i) === value ? 'active' : ''}`}
        style={{ position: 'absolute', top: ITEM_HEIGHT + i * ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT }}>
        {valueAt(i)}{suffix}
      </div>
    )
  }

  return (
    <div className="scroll-picker-col">
      <input
        className="field mono scroll-picker-manual"
        inputMode="numeric"
        value={manualInput}
        onChange={handleManualChange}
        onBlur={commitManual}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder={`Type ${min}-${max}`}
      />
      <div className="scroll-picker-wrap">
        <div className="scroll-picker-highlight" />
        <div className="scroll-picker" ref={containerRef} onScroll={handleScroll} style={{ scrollSnapType: 'y mandatory' }}>
          <div style={{ position: 'relative', height: totalHeight + ITEM_HEIGHT * 2 }}>
            {items}
          </div>
        </div>
      </div>
    </div>
  )
}
