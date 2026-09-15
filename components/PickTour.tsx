'use client'
import { useEffect, useRef, useState } from 'react'

export type TourStep = {
  /** Matches a `data-tour="…"` attribute on the element to point at. */
  target: string
  title: string
  body: React.ReactNode
}

/** Gap between the highlighted element and the card. */
const GAP = 12
/** Smallest allowed distance from the edge of the screen. */
const EDGE = 12
/** Widest the card gets on a big screen. */
const MAX_W = 320
/** Used until the card has been rendered once and can be measured. */
const ASSUMED_H = 180

type Frame = {
  /** The ring, already padded out from the element. */
  box: { top: number; left: number; width: number; height: number }
  cardLeft: number
  cardW: number
  cardTop: number
  above: boolean
  arrow: number
  /** True when the card had to be pulled away from its field to stay on
      screen, so the arrow would be pointing at nothing. */
  adrift: boolean
  /** Targets present on the page right now, in order. */
  names: string[]
  idx: number
}

/**
 * The element's box, widened to include anything of its own that hangs
 * outside it.
 *
 * A cashtag field is 44px tall right up until you type, at which point
 * it grows a suggestion list that is absolutely positioned and so
 * changes the field's measured height not at all. Placing the card
 * "just below the field" then puts it exactly on top of the list — and
 * the step doing this says *choose from the list*. Found by walking the
 * real form; the harness had no dropdown to hide.
 *
 * So the height is the union of the target and every descendant, which
 * for ordinary children is the target unchanged and for an open dropdown
 * is the field plus its list.
 *
 * **Vertically only.** The width stays the target's own. The pick-type
 * chips sit in a horizontally scrolling row, so unioning across them drew
 * a ring reaching off past the edge of the content column and into empty
 * space — the chips are really there, they are just clipped by a parent
 * the union knows nothing about. Nothing needs to escape sideways:
 * the one thing this exists for, a suggestion list, is exactly as wide as
 * the field it hangs under.
 *
 * Rect maths only, no `getComputedStyle`, and clamped to the viewport so
 * nothing off-screen can drag the ring with it.
 */
function outerRect(el: HTMLElement, vw: number, vh: number) {
  const r = el.getBoundingClientRect()
  let { top, bottom } = r
  for (const child of el.querySelectorAll<HTMLElement>('*')) {
    const c = child.getBoundingClientRect()
    if (c.width === 0 || c.height === 0) continue
    if (c.top < top) top = c.top
    if (c.bottom > bottom) bottom = c.bottom
  }
  const left = Math.max(r.left, 0)
  const right = Math.min(r.right, vw)
  top = Math.max(top, 0); bottom = Math.min(bottom, vh)
  return { top, left, right, bottom, width: right - left, height: bottom - top }
}

/**
 * A step-by-step walkthrough of a form, pointing at the real fields.
 *
 * Four decisions worth knowing about:
 *
 * **It doesn't block the form.** The dimmed area is `pointer-events:
 * none`, so the field being described stays usable while its step is on
 * screen. A tour that locks the page makes you read six steps and then
 * do the thing from memory; this one lets you fill each field as it's
 * explained, which is the version somebody actually finishes.
 *
 * **Steps are matched by `data-tour`, and missing ones are skipped.** The
 * pick form shows different fields depending on whether you're posting a
 * take or a pick, so the step list is filtered to whatever is really on
 * the page. Switching the tab mid-tour re-shapes the tour instead of
 * pointing at nothing.
 *
 * **Position is re-read on an animation frame rather than from scroll
 * events.** The thing being tracked can move for reasons no single
 * listener sees: smooth scrolling, a suggestion dropdown opening, the
 * mobile keyboard resizing the viewport, a conditional warning appearing
 * above the field. Re-measuring each frame is one `getBoundingClientRect`
 * for the length of a tutorial, which is nothing, and it is immune to all
 * of them at once. The measurement is compared before it's stored, so a
 * still page re-renders zero times rather than sixty times a second.
 *
 * **Nothing touches the DOM during render.** A client component still
 * server-renders once, and reading `document` in the render body throws
 * there — so every measurement happens inside the effect and the card
 * draws from state. Until the first frame lands this renders nothing,
 * which is also the correct server output.
 */
export default function PickTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  /* The *name* of the current step, not its index. The visible list
     changes size when the tab switches, and an index would silently
     point at a different step when it does. */
  const [current, setCurrent] = useState(steps[0]?.target ?? '')
  const [frame, setFrame] = useState<Frame | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrolledFor = useRef<string | null>(null)
  const lastKey = useRef('')

  /**
   * Centre the current step's field, once per step — and again if the
   * form changes shape under it.
   *
   * Two things have to be true at the same time. Once a step is centred,
   * where the reader scrolls next is their business, so the per-frame
   * measuring below must not drag them back. But switching Take to Pick
   * inserts three fields *above* the current step and can carry it off
   * the screen, which is not them scrolling away and should not be
   * treated as it.
   *
   * The step list changing is the precise signal for the second case —
   * scrolling cannot produce it — so the guard is keyed on the pair.
   * Keying it on the step alone was the first attempt and did nothing:
   * the step name doesn't change when the tab does, so the effect never
   * re-ran.
   */
  const shape = frame?.names.join() ?? ''
  useEffect(() => {
    const key = `${current}|${shape}`
    if (!current || scrolledFor.current === key) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${current}"]`)
    if (!el) return
    scrolledFor.current = key
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [current, shape])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)

      const present = steps.filter(s => document.querySelector(`[data-tour="${s.target}"]`))
      if (present.length === 0) { setFrame(null); return }

      /* If the current step's field just vanished — they switched to Take
         while sitting on "League" — fall back to the first one still
         there rather than showing an empty tour. */
      let idx = present.findIndex(s => s.target === current)
      if (idx < 0) idx = 0

      const el = document.querySelector<HTMLElement>(`[data-tour="${present[idx].target}"]`)
      if (!el) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const r = outerRect(el, vw, vh)

      const w = Math.min(MAX_W, vw - EDGE * 2)
      const h = cardRef.current?.offsetHeight ?? ASSUMED_H

      /* Below the field if it fits, otherwise above it. */
      const fitsBelow = r.bottom + GAP + h + EDGE <= vh
      const above = !fitsBelow && r.top - GAP - h - EDGE >= 0

      /* Then keep it on screen whatever the field does.
         Switching Take to Pick adds three fields and pushes the submit
         button below the fold; anchoring to the button put the card —
         and its Back and Next — off the bottom of the screen with no way
         to reach them. A card nobody can press is worse than one that
         has drifted from the thing it describes, so it pins to the edge
         and drops its arrow. */
      const wantTop = above ? r.top - GAP - h : r.bottom + GAP
      const top = Math.max(EDGE, Math.min(wantTop, vh - h - EDGE))
      const adrift = Math.abs(top - wantTop) > 1

      const centre = r.left + r.width / 2
      const left = Math.max(EDGE, Math.min(centre - w / 2, vw - w - EDGE))
      const round = (n: number) => Math.round(n)

      const next: Frame = {
        box: {
          top: round(r.top - 4), left: round(r.left - 4),
          width: round(r.width + 8), height: round(r.height + 8),
        },
        cardLeft: round(left),
        cardW: round(w),
        cardTop: round(top),
        above,
        adrift,
        /* The arrow tracks the field's centre, but stays on the card. */
        arrow: round(Math.max(18, Math.min(centre - left, w - 18))),
        names: present.map(s => s.target),
        idx,
      }

      const key = JSON.stringify(next)
      if (key !== lastKey.current) { lastKey.current = key; setFrame(next) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [steps, current])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  if (!frame) return null
  const step = steps.find(s => s.target === frame.names[frame.idx])
  if (!step) return null

  const last = frame.idx === frame.names.length - 1

  function go(delta: number) {
    if (!frame) return
    const name = frame.names[frame.idx + delta]
    if (name) setCurrent(name)
    else onDone()
  }

  return (
    <>
      {/* The ring, and — via a very large shadow spread — the dim over
          everything else. Never takes a click: the field underneath has
          to stay usable. */}
      <div
        className="tour-spot"
        style={{
          top: frame.box.top, left: frame.box.left,
          width: frame.box.width, height: frame.box.height,
        }}
      />
      <div
        ref={cardRef}
        className={`tour-card${frame.above ? ' above' : ''}`}
        style={{ left: frame.cardLeft, width: frame.cardW, top: frame.cardTop }}
        role="dialog"
        aria-live="polite"
        aria-label={`Step ${frame.idx + 1}: ${step.title}`}
      >
        {!frame.adrift && <span className="tour-arrow" style={{ left: frame.arrow }} />}
        <p className="tour-count">Step {frame.idx + 1} of {frame.names.length}</p>
        <h3 className="tour-title">{step.title}</h3>
        <div className="tour-body">{step.body}</div>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={onDone}>
            {last ? 'Close' : 'Skip'}
          </button>
          <div className="tour-nav">
            {frame.idx > 0 && (
              <button type="button" className="tour-back" onClick={() => go(-1)}>Back</button>
            )}
            <button type="button" className="tour-next" onClick={() => go(1)}>
              {last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
