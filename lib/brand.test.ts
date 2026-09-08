import { readFileSync } from 'node:fs'
import {
  BRAND_GREEN, BRAND_GREEN_ON_LIGHT, BRAND_INK, BRAND_DEEP, COIN_STOPS,
} from './brand'

/**
 * The green can't be defined once.
 *
 * The site reads it from a CSS custom property, email and the OG images
 * can't read one, and a static SVG can't import anything — so the value
 * exists in four places by necessity. What isn't necessary is those four
 * drifting, which is how a site ends up with three greens on one screen.
 * This is the check that stops it.
 */

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const svgIcon = readFileSync(new URL('../app/icon.svg', import.meta.url), 'utf8')
const svgLogo = readFileSync(new URL('../public/logo.svg', import.meta.url), 'utf8')

/** Every value a `--name:` is given anywhere in the stylesheet. */
function declared(name: string): string[] {
  const out: string[] = []
  const re = new RegExp(`--${name}:\\s*([^;]+);`, 'g')
  for (const m of css.matchAll(re)) out.push(m[1].trim())
  return out
}

const up = (s: string) => s.toUpperCase()

console.log('the stylesheet and lib/brand.ts agree on the green')
const brands = declared('brand').map(up)
check('--brand is declared for dark and both light paths', brands.length, 3)
check('dark --brand is BRAND_GREEN', brands[0], up(BRAND_GREEN))
check('both light --brand are BRAND_GREEN_ON_LIGHT',
  brands.slice(1), [up(BRAND_GREEN_ON_LIGHT), up(BRAND_GREEN_ON_LIGHT)])
check('dark --brand-deep is BRAND_DEEP', declared('brand-deep').map(up)[0], up(BRAND_DEEP))
check('dark --btn-ink is BRAND_INK', declared('btn-ink').map(up)[0], up(BRAND_INK))

console.log('\nno token is left pointing at itself')
// This is not hypothetical: --btn-ink, --chrome, --shadow, --tint-brand
// and --tint-bear all shipped as `--x: var(--x)`, which is invalid at
// computed-value time. Dark mode lost every one of them for five days —
// no tinted DM bubble, no chrome behind the tab bar, no button text
// colour — and nothing failed loudly enough to notice.
for (const name of ['brand', 'brand-deep', 'btn-ink', 'chrome', 'shadow',
                    'tint-brand', 'tint-brand-soft', 'tint-bear', 'edge-brand', 'glow-brand']) {
  const values = declared(name)
  check(`--${name} is defined`, values.length > 0, true)
  check(`--${name} never resolves to itself`, values.some(v => v.includes(`var(--${name})`)), false)
}

console.log('\nthe derived greens are built from the brand green, not a new one')
// rgba() can't be derived from a hex custom property in plain CSS, so
// these are written out — but they must be the same green.
const rgb = (hex: string) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')
}
for (const name of ['tint-brand', 'tint-brand-soft', 'edge-brand', 'glow-brand']) {
  const [dark, ...lights] = declared(name)
  check(`dark --${name} uses the brand green`, dark.includes(rgb(BRAND_GREEN)), true)
  check(`light --${name} uses the light brand green`,
    lights.every(v => v.includes(rgb(BRAND_GREEN_ON_LIGHT))), true)
}

console.log('\nno green literal escaped back into the stylesheet')
// Anything below the palette block writing its own green is the bug
// this file exists to catch, so the search starts after it.
const belowPalette = css.slice(css.indexOf('/* League accents'))
check('no raw brand hex', belowPalette.toUpperCase().includes(up(BRAND_GREEN)), false)
check('no raw brand rgb', belowPalette.includes(rgb(BRAND_GREEN)), false)

console.log('\nthe coin is the same coin in all three places')
for (const [where, svg] of [['app/icon.svg', svgIcon], ['public/logo.svg', svgLogo]] as const) {
  const stops = [...svg.matchAll(/stop-color="(#[0-9A-Fa-f]{6})"/g)].map(m => up(m[1]))
  check(`${where} carries every coin stop`,
    COIN_STOPS.every(s => stops.includes(up(s))), true)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
