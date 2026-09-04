/**
 * Free live tennis.
 *
 * Both feeds here are the tour's own YouTube channels, embedded through
 * YouTube's player. That distinction is the whole reason this is allowed:
 * the matches are also free to watch on itftennis.com, but free to watch
 * is not free to rebroadcast, and iframing a federation's own player
 * would be the second thing. YouTube's embed is offered for this.
 *
 * The channel-level embed below resolves to whatever is live on that
 * channel right now, and shows YouTube's own offline card when nothing
 * is. That means no API key, no polling and nothing to schedule — which
 * matters, because the Data API's search quota would run dry and Hobby
 * only allows one cron a day.
 *
 * Deliberately not the matches on /scores. ESPN carries the main tour,
 * whose streaming rights are sold; what's free is the tier below it.
 */
export type WatchFeed = {
  key: string
  name: string
  blurb: string
  channel: string
}

export const WATCH_FEEDS: WatchFeed[] = [
  {
    key: 'challenger',
    name: 'ATP Challenger',
    blurb: 'One rung below the main tour, streamed free by the ATP. A court feed runs all day, so it moves from match to match.',
    channel: 'UCT12ocLoA-sqRfs12yQM2Bg',
  },
  {
    key: 'itf',
    name: 'ITF World Tennis',
    blurb: 'The World Tennis Tour, where nearly every professional starts. Coverage is thinner and comes and goes with the calendar.',
    channel: 'UC5WdeJGV1zSUtBFpg186zZg',
  },
]

export function feedFor(key: string | undefined): WatchFeed {
  return WATCH_FEEDS.find(f => f.key === key) ?? WATCH_FEEDS[0]
}

/**
 * Chat room key. game_messages keys rooms by string and has no foreign
 * key to a game, so a watch room needs no schema change — only a prefix
 * that can't collide with the "LEAGUE:espn_id" the game pages use.
 */
export function roomKeyFor(feed: WatchFeed): string {
  return `watch:${feed.key}`
}

export function embedSrcFor(feed: WatchFeed): string {
  return `https://www.youtube.com/embed/live_stream?channel=${feed.channel}`
}
