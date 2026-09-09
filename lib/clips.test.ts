import { readFileSync } from 'node:fs'
import { parseClipFeed, parseClipPlaylist, capPerLeague, CLIP_FEEDS, embedFor, watchOn, type Clip, type ClipFeed } from './clips'

/**
 * Parsed against real channel feeds saved to lib/fixtures, not against a
 * guess at the shape. The filtering is the part that matters: a league
 * channel posts its own adverts next to the highlights.
 */
let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`)
}
const load = (f: string) => readFileSync(new URL(`fixtures/${f}`, import.meta.url), 'utf8')
const nfl = CLIP_FEEDS.find(f => f.league === 'NFL')!
const mlb = CLIP_FEEDS.find(f => f.league === 'MLB')!

console.log('a real channel feed parses')
{
  const clips = parseClipFeed(load('nfl-feed.xml'), nfl)
  check('every clip has an id', clips.every(c => c.id.length > 5), true)
  check('every clip has a title', clips.every(c => c.title.length > 0), true)
  check('every clip carries its league', clips.every(c => c.league === 'NFL'), true)
  check('published dates parse', clips.every(c => !c.publishedAt || !isNaN(Date.parse(c.publishedAt))), true)
  check('thumbnails are youtube urls',
    clips.every(c => !c.thumbnail || c.thumbnail.startsWith('https://')), true)
}

console.log('\nnon-highlights are filtered out')
{
  const all = parseClipFeed(load('nfl-feed.xml'), { ...nfl, match: [''] })
  const clips = parseClipFeed(load('nfl-feed.xml'), nfl)
  check('the raw feed has more than the highlights', all.length >= clips.length, true)
  check('everything kept says highlight',
    clips.every(c => c.title.toLowerCase().includes('highlight')), true)
  // The real one that made this necessary.
  check('an advert in the feed is dropped',
    clips.some(c => /NFL\+ - Bed/i.test(c.title)), false)
}

console.log('\nthe same parser handles a second league')
{
  const clips = parseClipFeed(load('mlb-feed.xml'), mlb)
  check('parses', Array.isArray(clips), true)
  check('all MLB', clips.every(c => c.league === 'MLB'), true)
}

console.log('\nmalformed input never throws')
for (const [label, xml] of [
  ['empty', ''], ['not xml', 'hello'], ['no entries', '<feed></feed>'],
  ['entry with no id', '<entry><media:title>Game Highlights</media:title></entry>'],
  ['entry with no title', '<entry><yt:videoId>abc123</yt:videoId></entry>'],
] as const) {
  check(label, parseClipFeed(xml, nfl).length, 0)
}

console.log('\nXML entities are decoded, not shown raw')
{
  const xml = '<entry><yt:videoId>x1</yt:videoId><media:title>Bengals &amp; Ravens Highlights</media:title></entry>'
  check('ampersand', parseClipFeed(xml, nfl)[0].title, 'Bengals & Ravens Highlights')
  const quoted = '<entry><yt:videoId>x2</yt:videoId><media:title>&quot;Highlights&quot;</media:title></entry>'
  check('quotes', parseClipFeed(quoted, nfl)[0].title, '"Highlights"')
}

console.log('\nurls')
check('embed', embedFor('abc'), 'https://www.youtube.com/embed/abc')
check('watch', watchOn('abc'), 'https://www.youtube.com/watch?v=abc')

console.log('\nevery configured channel is a real one')
check('four leagues', CLIP_FEEDS.length, 4)
check('channel ids look like channel ids',
  CLIP_FEEDS.every((f: ClipFeed) => /^UC[\w-]{22}$/.test(f.channel)), true)
check('no duplicate channels', new Set(CLIP_FEEDS.map(f => f.channel)).size, CLIP_FEEDS.length)

console.log('\nno league can crowd out the others')
{
  // The real shape of the problem: MLB plays every day in September and
  // posts several reels a night, so on pure recency it filled the rail
  // and an NFL follower saw nothing they asked for.
  const clip = (league: string, day: number): Clip => ({
    id: `${league}${day}`, title: `${league} Highlights`, thumbnail: null,
    publishedAt: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`, league,
  })
  const mlbFlood = [10, 9, 8, 7, 6, 5].map(d => clip('MLB', d))
  const oneNfl = [clip('NFL', 4)]

  const capped = capPerLeague([...mlbFlood, ...oneNfl], 2)
  check('MLB is held to two', capped.filter(c => c.league === 'MLB').length, 2)
  check('and they are the newest two', capped.filter(c => c.league === 'MLB').map(c => c.id), ['MLB10', 'MLB9'])
  check('the NFL clip survives', capped.some(c => c.league === 'NFL'), true)
  check('the result is still newest-first', capped.map(c => c.id), ['MLB10', 'MLB9', 'NFL4'])
}

console.log('\ncapping is a limit, not a quota')
{
  const clip = (league: string, day: number): Clip => ({
    id: `${league}${day}`, title: 't', thumbnail: null,
    publishedAt: `2026-09-0${day}T12:00:00Z`, league,
  })
  check('a league with one clip keeps its one',
    capPerLeague([clip('NHL', 1)], 4).length, 1)
  check('nothing in, nothing out', capPerLeague([], 2), [])
  check('a cap of zero keeps nothing', capPerLeague([clip('NBA', 1)], 0).length, 0)
  const undated = [{ id: 'x', title: 't', thumbnail: null, publishedAt: null, league: 'NFL' }] as Clip[]
  check('a missing date does not throw', capPerLeague(undated, 2).length, 1)
}

console.log('\nthe Data API response parses the same way as the feed')
{
  const json = {
    items: [
      { snippet: { title: 'CHIEFS vs. RAVENS | Week 1 Game Highlights',
                   resourceId: { videoId: 'aaaaaaaaaaa' }, publishedAt: '2026-09-08T01:00:00Z',
                   thumbnails: { medium: { url: 'https://i.ytimg.com/a.jpg' } } } },
      { snippet: { title: 'NFL+ - Bed', resourceId: { videoId: 'bbbbbbbbbbb' },
                   publishedAt: '2026-09-08T02:00:00Z', thumbnails: {} } },
    ],
  }
  const clips = parseClipPlaylist(json, nfl)
  check('only the highlight is kept', clips.length, 1)
  check('id', clips[0].id, 'aaaaaaaaaaa')
  check('thumbnail', clips[0].thumbnail, 'https://i.ytimg.com/a.jpg')
  check('league is stamped on', clips[0].league, 'NFL')
  check('a missing thumbnail is null, not undefined',
    parseClipPlaylist({ items: [{ snippet: { title: 'Highlights', resourceId: { videoId: 'ccccccccccc' } } }] }, nfl)[0].thumbnail, null)
}

console.log('\na broken API response is an empty list, never a throw')
for (const [label, json] of [
  ['null', null], ['no items', {}], ['items not an array', { items: 'x' }],
  ['quota error shape', { error: { code: 403 } }],
  ['item with no video id', { items: [{ snippet: { title: 'Highlights' } }] }],
  ['item with no snippet', { items: [{}] }],
] as const) {
  check(label, parseClipPlaylist(json, nfl).length, 0)
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
