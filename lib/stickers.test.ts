import { STICKERS, stickerUrl, isStickerUrl } from './stickers'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}

console.log('the list is well formed')
check('there are some', STICKERS.length >= 12, true)
check('codepoints are hex', STICKERS.every(s => /^[0-9a-f]{4,6}$/.test(s.code)), true)
check('no duplicates', new Set(STICKERS.map(s => s.code)).size, STICKERS.length)
check('every one has a label', STICKERS.every(s => s.label.length > 1), true)
check('every one has its character', STICKERS.every(s => s.char.length > 0), true)

console.log('\nthe url it builds is one the guard accepts')
check('all valid', STICKERS.every(s => isStickerUrl(stickerUrl(s.code))), true)

console.log('\nand the guard refuses anything else')
for (const url of [
  'https://evil.example/x.webp',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif',
  'https://fonts.gstatic.com.evil.example/s/e/notoemoji/latest/1f525/512.webp',
  'http://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
  'https://fonts.gstatic.com/s/e/notoemoji/latest/../../x/512.webp',
  '',
]) {
  check(`refused: ${url.slice(0, 52) || '(empty)'}`, isStickerUrl(url), false)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
