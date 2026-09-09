/**
 * What order the timeline goes in.
 *
 * The feed was strictly reverse-chronological, which sounds neutral and
 * isn't. The house model posts every few hours and five people post
 * every few days, so the model owned the top of the feed permanently —
 * on 9 Sep the twelve most recent posts were all it. A stranger arriving
 * from an ad saw one automated account talking to itself, which reads as
 * fake or dead rather than as quiet.
 *
 * Removing the model isn't the answer either: 19 human posts spread over
 * three weeks is a worse first impression than a busy one. The fix is
 * proportion. People lead, and the model fills the gaps at a fixed
 * ratio instead of by volume.
 *
 * The trade, stated plainly: this makes the feed *ranked* rather than
 * chronological, so a person's post from yesterday can sit above the
 * model's from an hour ago. Every card still shows its own timestamp, so
 * nothing is concealed — but it is no longer a strict timeline, and that
 * is a real change rather than a tidy-up.
 *
 * This is a stopgap for a small site. Once enough people post that they
 * fill the feed on their own, the ratio stops mattering and this can go.
 */

/** People posts emitted between each house post. */
const PEOPLE_PER_HOUSE = 2

type Author = { is_bot?: boolean | null }

/**
 * The joined author, which PostgREST types as an array and returns as an
 * object. Both shapes are read here on purpose: if that ever flips, the
 * naive `author?.is_bot` would quietly be `undefined` for every row, and
 * the whole feed would be classified as human — which fails by silently
 * doing nothing, the hardest kind of failure to notice.
 */
type MaybeBot = { author?: Author | Author[] | null }

function isHouse(post: MaybeBot): boolean {
  const a = post.author
  if (!a) return false
  return Array.isArray(a) ? !!a[0]?.is_bot : !!a.is_bot
}

export function arrangeFeed<T extends MaybeBot>(
  posts: T[],
  peoplePerHouse: number = PEOPLE_PER_HOUSE,
): T[] {
  // Both queues keep the order they arrived in, which is newest-first —
  // so within each kind the feed is still chronological.
  const people: T[] = []
  const house: T[] = []
  for (const p of posts) (isHouse(p) ? house : people).push(p)

  // Nothing to balance. Also the case once real people fill the feed,
  // at which point this function is doing no work and can be removed.
  if (people.length === 0 || house.length === 0) return posts

  const out: T[] = []
  let sincePost = 0
  while (people.length > 0 || house.length > 0) {
    const takeHouse =
      people.length === 0 || (house.length > 0 && sincePost >= peoplePerHouse)
    if (takeHouse) {
      out.push(house.shift()!)
      sincePost = 0
    } else {
      out.push(people.shift()!)
      sincePost++
    }
  }
  return out
}
