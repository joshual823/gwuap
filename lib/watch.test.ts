import { uploadsPlaylistFor, parseLiveVideos, feedsBySport, roomLabel, feedFor, WATCH_FEEDS } from './watch'

let pass = 0, fail = 0
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`)
}

console.log('a channel id maps to its uploads playlist')
// Saves a whole API call per poll. If YouTube ever changes this the live
// list quietly empties, so it's worth a test that says what we assumed.
check('ATP Challenger', uploadsPlaylistFor('UCT12ocLoA-sqRfs12yQM2Bg'), 'UUT12ocLoA-sqRfs12yQM2Bg')
check('only the prefix changes', uploadsPlaylistFor('UCabc'), 'UUabc')

console.log('\nonly live broadcasts reach the picker')
const sample = {
  items: [
    { id: 'aaa', snippet: { title: 'Court 1 — live', liveBroadcastContent: 'live',
        thumbnails: { medium: { url: 'https://i.ytimg.com/a.jpg' } } } },
    { id: 'bbb', snippet: { title: 'Highlights from yesterday', liveBroadcastContent: 'none',
        thumbnails: { medium: { url: 'https://i.ytimg.com/b.jpg' } } } },
    { id: 'ccc', snippet: { title: 'Starts at 3pm', liveBroadcastContent: 'upcoming' } },
    { id: 'ddd', snippet: { title: 'Court 2 — live', liveBroadcastContent: 'live' } },
  ],
}
const parsed = parseLiveVideos(sample)
check('three of four are live or scheduled', parsed.length, 3)
check('finished video excluded', parsed.some(v => v.id === 'bbb'), false)
// Upcoming is now kept. It used to be dropped because embedding one
// shows a countdown and reads as broken — which is still true, so the
// page only ever embeds a video whose state is 'live' and lists the
// rest with their start time. Somebody asking where to watch a match is
// usually asking before it starts, so dropping them answered the
// question only while it was too late to be useful.
check('upcoming kept', parsed.some(v => v.id === 'ccc'), true)
check('and marked as upcoming', parsed.find(v => v.id === 'ccc')?.state, 'upcoming')
check('live is marked live', parsed.find(v => v.id === 'aaa')?.state, 'live')
// Live first, so the page's default selection is always watchable.
check('live sorts above scheduled', parsed.map(v => v.id), ['aaa', 'ddd', 'ccc'])
check('title carried through', parsed[0].title, 'Court 1 — live')
check('thumbnail carried', parsed[0].thumbnail, 'https://i.ytimg.com/a.jpg')
check('missing thumbnail is null', parsed[1].thumbnail, null)
check('scheduled time carried', parseLiveVideos({ items: [
  { id: 'eee', snippet: { title: 'Later', liveBroadcastContent: 'upcoming' },
    liveStreamingDetails: { scheduledStartTime: '2026-09-16T13:00:00Z' } },
] })[0].startsAt, '2026-09-16T13:00:00Z')

console.log('\nevery feed says where the tour streams it itself')
for (const f of WATCH_FEEDS) {
  check(`${f.key} has an official link`, /^https:\/\//.test(f.official.href), true)
}
// The ITF is the whole reason `channel` is optional: their YouTube has
// two videos on it and their streaming is all on itftennis.com.
check('the ITF is a link, not a player', WATCH_FEEDS.find(f => f.key === 'itf')?.channel, undefined)
check('and asks for no account', WATCH_FEEDS.find(f => f.key === 'itf')?.official.account, false)

console.log('\na broken response is an empty list, never a throw')
check('no items key', parseLiveVideos({}), [])
check('null', parseLiveVideos(null), [])
check('items not an array', parseLiveVideos({ items: 'nope' }), [])
check('quota error shape', parseLiveVideos({ error: { code: 403 } }), [])
check('item with no id dropped', parseLiveVideos({ items: [{ snippet: { liveBroadcastContent: 'live' } }] }), [])

console.log('\nfeeds are grouped and addressable')
check('grouped by sport', feedsBySport().map(g => g.sport), ['Tennis', 'Table Tennis'])
check('every feed lands in a group', feedsBySport().reduce((n, g) => n + g.feeds.length, 0), WATCH_FEEDS.length)
// An unknown ?feed= is someone editing the URL, not an error worth a 404.
check('unknown feed falls back', feedFor('nonsense').key, WATCH_FEEDS[0].key)
check('known feed resolves', feedFor('wtt').name, 'World Table Tennis')

console.log('\nroom keys read as rooms in the moderation queue')
check('watch room', roomLabel('watch:wtt'), 'Watch room · World Table Tennis')
check('game room', roomLabel('MLB:401877193'), 'MLB game #401877193')
check('unknown watch feed', roomLabel('watch:gone'), 'Watch room')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
