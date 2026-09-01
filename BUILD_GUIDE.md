# Gwuap — Build Guide

A session-by-session checklist for building and launching Gwuap, a social
website for sports bettors. Written for a coding beginner who's
comfortable in a terminal but building this for the first time.

Keep this file open in a tab as we work. Check items off as we go —
if we get interrupted or pick this up days later, this tells us exactly
where we left off.

---

## The plan, in order

1. Core MVP (auth, posts, follows, likes, comments, leaderboard, search, block/report, admin) ✅
2. Sign up, post, verify the loop works ✅
3. Restyle to the mobile-first hybrid design (current step)
4. Deploy it live (Vercel)
5. Dollar amounts, odds/stake dropdowns, unverified badge ✅
6. Make it not broken — dead links + cashtag autocomplete (current step)
7. Seed the feed, then invite the first real testers
8. Sports news tab, with a "post a pick on this" button
9. DM requests (permission-based)
10. League chat rooms + the moderated Vent room
11. Polish round two, then a wider invite

Do not skip ahead before earlier steps are done and working. An empty,
un-launched site with every feature built is worth less than a live site
with five features that real people are using.

---

## Session 1 — Get the database running ✅ DONE

- [x] Supabase project created, schema loaded, storage bucket created
- [x] .env.local configured with real keys
- [x] Site running locally at localhost:3000

---

## Session 2 — Sign up, post, and fix whatever breaks ✅ DONE

- [x] Signed up for a real account (hit and fixed a missing `middleware.ts`
      file, which was needed for login sessions to persist)
- [x] Posted a real pick, confirmed it shows in the feed
- [x] Liked a post
- [ ] Comment thread page (`/post/[id]`) — known incomplete, on the list
- [ ] Admin access — not urgent, skipped for now, revisit once there's
      real content to moderate

---

## Session 3 — Restyle to the mobile-first hybrid design ✅ DONE

- [x] Rewrote `app/globals.css` with the new dark palette, JetBrains Mono
      for data/tickers, Inter for body text
- [x] Replaced the top nav links with a bottom tab bar
      (Home / Search / Post / Leaderboard / Profile)
- [x] Added cashtag-style pick tags (`$LAL -4.5`) to post cards
- [x] Added Backing / Fading sentiment tags to the post form and post cards
- [x] Added the "Unverified" badge to every pick card
- [x] Added a live ticker strip under the top bar (real recent picks,
      not fake data)
- [x] Added a "Trending on Gwuap" module to the feed (real aggregation
      of tag + sentiment counts from recent posts)
- [x] Post form redone to capture sentiment, a cashtag, and currency
- [x] Odds and stake are now scroll-and-type number pickers (odds 1–10,000,
      stake up to $1,000,000, both virtualized so the browser doesn't choke,
      both also typeable for speed) — fixed a scroll-snap animation bug
      along the way where the wheel would jitter on page load until touched

---

## Session 4 — Deploy it live ✅ DONE (site is live)

**Goal by end of session:** a real public URL anyone can visit.

- [x] Patched Next.js to 14.2.35, the last version that line will ever
      receive security fixes for — Next.js stopped backporting patches to
      13.x/14.x as of May 2026, so `npm audit` will keep showing some
      remaining issues no matter what on this line. Deploying anyway since
      Gwuap isn't handling money and only a small test group will use it
      at first. **Before inviting a wider public audience, do a dedicated
      session to upgrade to Next.js 15.x or 16.x** — it's a real breaking
      change (cookie/session handling API changed), not a quick bump.
- [x] Pushed the project to GitHub (github.com/joshual823/gwuap) using
      GitHub Desktop, after working through: git identity setup,
      accidentally committing .env.local/node_modules before .gitignore
      existed (fixed by wiping and redoing git history before anything
      reached GitHub — no secrets were ever actually exposed publicly),
      and a stale remote connection after the history reset
- [x] Created the Vercel account and imported the repo — project is
      `gwuap`, and the GitHub integration is connected, so **pushing to
      `main` automatically deploys to production**. You don't run a
      deploy command; you push and Vercel does the rest.
- [x] Added all 3 environment variables in Vercel (Production, Preview,
      and Development). `SUPABASE_SERVICE_ROLE_KEY` is stored as a
      Secret and is Production/Preview only, which is correct — locally
      it comes from `.env.local`.
- [x] Deployed. Five successful production deploys.
- [x] **The site is live: https://gwuap.vercel.app**
      (`/`, `/feed`, and `/leaderboard` all confirmed serving.)
- [x] Posting verified end-to-end on the live URL (Session 5) — writes
      do reach Supabase from Vercel
- [ ] Still unverified live: signup as a brand-new user, and likes.
      Worth doing before you invite anyone.
- [ ] Also revisit: re-enable "Confirm email" in Supabase with a real
      email provider (or make a deliberate decision to leave it off) —
      it's currently OFF for local testing only

**What "done" looks like:** you can text a friend a link and they can
actually use the site, on their phone, and it looks the way it's supposed to.

---

## Session 5 — Dollar amounts + form polish ✅ DONE

- [x] Ran `supabase/migrations/001_session5_dollars.sql` in Supabase and
      confirmed `posts.bet_type`, `posts.profit`, and
      `leaderboard.total_profit` all exist
- [x] Pushed, deployed to production, and **verified live on a phone**:
      posted -110 for $50, form read "Risking $50 to win $45.45", graded
      it a win, card showed **+$45.45 in green**

> **Lesson worth keeping:** now that the site is live, pushing to `main`
> deploys to production automatically. When a change needs a database
> migration, run the SQL **first**, then push. Push first and the live
> site asks Supabase for columns that don't exist yet, and the feed
> breaks for everyone until the migration catches up.

- [x] Add dollar fields to picks — `posts.profit` holds the realized
      dollar result (+ won / − lost), `posts.stake` is the amount risked.
      Profit is **computed at grading time** from the odds and stake
      already on the post, never typed in, so the number can never
      disagree with the posted price. Math lives in `lib/odds.ts` and is
      unit-checked against real sportsbook prices (-110 on $50 → $45.45).
- [x] Update the leaderboard to show total $ profit alongside win %
      (new `total_profit` column on the `leaderboard` view; the row now
      shows record + profit under the username, win % on the right)
- [x] Update the post card UI to show the $ amount — graded picks show
      the signed result in green/red, pending picks show TO WIN instead
- [x] Replace the odds field with a structured picker
      (Moneyline / Spread / Total selector, − fav / + dog toggle, number
      input). Rejects magnitudes under 100, which aren't valid American
      odds — the old wheel happily accepted "-7" and mis-priced it.
- [x] Replace the stake field with quick-select chips
      ($10 / $25 / $50 / $100 / $250 / Custom)
- [x] Retired the Session 3 scroll wheel (`components/ScrollPicker.tsx`
      deleted — it's still in git history if you ever want it back)
- [x] Fixed: the Unverified badge was nested inside the odds/stake block,
      so a pick posted without either showed no badge at all. It now
      renders on every pick card, always.
- [x] Fixed: the profile page wasn't fetching `tag` or `sentiment`, so
      cashtags and Backing/Fading were invisible on profiles

**Decided this session:** every pick is US dollars. The currency selector
(€/£/¥/units) is gone — a leaderboard that adds up mixed currencies isn't
a real number. The `currency` column is still there holding '$' so no data
was destroyed; there's a commented-out DROP at the bottom of the migration
for whenever you want to retire it.

**How to check it worked:** post a pick at -110 for $50, confirm the form
says "Risking $50 to win $45.45", then grade it a win on your profile and
confirm the card shows +$45.45 in green.

---

## YOU ARE HERE

**Sessions 1-6 are done, deployed, and tested live at
https://gwuap.vercel.app.** Nothing is half-built. Every link in the UI
goes somewhere real. Four migrations have been run (001-004).

**Next up is Session 7 — and it is not a coding session.** It's seeding
the feed and getting five people on it. Nothing below Session 7 should
start before that happens.

**The order changed, and here's why.** The original plan put DM requests
next. Building private messaging for a site with one account is the exact
trap this guide warns about on page one — you can't test it, and neither
can your first testers, because there's nobody to message. Worse, three
links in the shipped UI are 404 right now and a tester will tap all three
in their first minute. So Session 6 became "make it not broken," seeding
and inviting moved up, and DMs moved back behind the point where there
are actually people to message.

---

## Session 6 — Make it not broken ✅ DONE (tested live)

**Goal:** nothing a first-time visitor touches is broken or fake.

- [x] **Finished the comment thread page** (`/post/[id]`). Every post card
      has a comment icon linking here and it 404s on the live site today.
      Half-built already, see above.
- [x] **Removed `/chat` and `/dm` from the header.** Both 404, and both
      display hardcoded fake notification badges ("2" and "1"). Either
      build them or strip the links — but fake badges have to go before
      anyone else sees the site.
- [x] **Cashtag auto-uppercase.** One line in the post form's onChange.
- [x] **Cashtag autocomplete**, StockTwits-style: type `$L`, get a
      dropdown of matching teams with full names. Static file of the 124
      teams in NBA/NFL/MLB/NHL — no API, no database, no monthly cost.
      Filter the list by the league already selected on the form, which
      also resolves the `LAC` = Clippers *and* Chargers collision.
      College and soccer stay free-text for now; that's a long tail worth
      filling in only once someone actually posts those picks.
- [x] Tested on the live URL — signup, posting, comments, replies, and
      reactions all confirmed working against production.

### Session 6b — bet types, no uploads, emoji reactions

**Run `supabase/migrations/002_session6_bettypes_reactions.sql` BEFORE
pushing.** Same rule as Session 5: push first and the live site asks for
columns that don't exist.

- [x] **Bet types widened from 3 to 8**: Moneyline, Spread, Total (O/U),
      Player prop, Team prop, Parlay, Future, Other. One flat wrapping
      row of chips, not a nested category picker — two levels means two
      taps every post, and most people don't know which bucket their bet
      is in. Note a "total" **is** the over/under; they're the same bet,
      so there's no separate entry for it.
- [x] **Bet slip upload removed.** No image moderation and one solo
      moderator is a bad combination. The storage bucket and the
      `slip_image_url` column stay, and post cards still display an image
      if one exists — nothing is destroyed, only the upload UI is gone.
      **Tradeoff accepted:** a slip screenshot was the closest thing to
      real verification we had. It comes back with moderation behind it.
- [x] **Emoji reactions.** Tap for a heart, press and hold for a grid of
      48 reactions. One reaction per person per post — picking a new one
      replaces your old one, tapping your own removes it. Counts show as
      chips on the card and yours is outlined.

**Why it's a curated grid and not the iPhone keyboard:** a web page
cannot open the system emoji keyboard. There's no API — it's part of the
native keyboard UI and only appears when the user taps the emoji key
themselves. Slack, Discord, and Notion all ship their own grid for the
same reason.

**Migration gotcha worth remembering:** the original schema only had
INSERT and DELETE policies on `likes`. Changing a reaction is an UPDATE,
so without a new RLS policy every reaction change would have been
silently rejected. The migration adds it.

### Session 6d — drop the badge, lock picks, new sports

**Run `supabase/migrations/004_lock_picks_and_new_sports.sql` before
pushing.**

- [x] **"Unverified" badge removed.** It read the same on every post, so
      it was noise, not a signal.
- [x] **Picks are now locked after posting** — this is the part that
      actually matters. `users update own posts` allowed updating *any*
      column including `odds` and `stake`. No edit button exists, but the
      anon key ships in every browser, so the API was open: a user could
      have changed their posted odds after the game. Column-level grants
      now let an author change only `status` and `profit`. Grading still
      works; the terms of the bet don't.
- [x] **Tennis, UFC, and Boxing categories.** UFC and Boxing were sharing
      one category — split, and Tennis added.
- [x] **Athlete cashtags**, 98 of them: 36 tennis players, 38 UFC
      fighters, 24 boxers. Code is the surname, and nicknames work
      ("poatan" finds Pereira, "coco" finds Gauff). 222 tickers total.
      `lib/teams.ts` became `lib/tickers.ts` since it's no longer only
      teams.

**Caveat on athlete lists:** unlike teams, these go stale. Fighters
retire, rankings churn, new players break through. It's a plain array in
one file — edit it whenever. Also worth knowing it was assembled from
model knowledge with a mid-2026 cutoff, so check it against a current
ranking before you lean on it.

**Still open, if you ever want a badge that means something:** proving a
pick was posted before the game started needs game start times. ESPN
publishes a free undocumented scoreboard JSON that hobby projects use
for exactly this; it's free but unofficial and can break without notice.
That's the cheap path if you decide the badge is worth it.

### Session 6c — comment replies + comment reactions

**Run `supabase/migrations/003_comment_replies_reactions.sql` before
pushing.**

- [x] **Emoji set grown to 78** (was 48). Adds pride and trans flags,
      eggplant, lying face, angry faces, cap (as in "no cap"), snake,
      and 20-odd more. All verified to fit the 8-code-point column
      limit — the trans flag is the widest at 5.
- [x] **Reactions on comments**, same tap-or-hold behavior as posts, in
      a compact size. New `comment_reactions` table mirroring `likes`.
- [x] **Reply threading**, one level deep like Instagram and Facebook
      rather than Twitter's unlimited nesting — deep nesting is
      unreadable in a 460px column. Replying to a reply attaches to the
      same top-level parent and @-mentions the person instead.
- [x] The comment list became a single client component
      (`CommentThread.tsx`) so the composer, the "replying to" state,
      and the list can share it. `CommentForm.tsx` folded into it.

**Note:** deleting a comment cascades to its replies. That's deliberate
(an orphaned reply to nothing is worse), but it means deleting a
top-level comment removes the conversation under it.

**What actually shipped:**
- `/post/[id]` exists: the post, its replies oldest-first, a reply box,
  and a Delete on your own comments with a confirm step. Logged-out
  visitors see the thread and a prompt to log in.
- The header's chat and envelope icons are gone, along with their fake
  "2" and "1" badges. They come back in Sessions 9-10 when the features
  are real.
- The league selector moved **above** the cashtag field, because
  suggestions are filtered by league and it can't help you until it
  knows which one.
- `lib/teams.ts` holds all 124 teams across NBA/NFL/MLB/NHL, verified
  for count and for unique codes within each league. Typing `$L` in the
  NBA gives you LAC and LAL; `$LA` in MLB gives LAA and LAD. Team names
  and nicknames work too — "lakers", "niners", "red sox".
- Tags are trimmed before saving. The autocomplete appends a trailing
  space so you can type the line next, and an untrimmed `"$LAL "` would
  have fragmented Trending exactly the way free text did.

**Why the cashtag work belongs here and not in "polish":** the Trending
module groups picks by the exact tag string (`app/feed/page.tsx`), so
`$LAL`, `$lal`, and `$Lakers` count as three different things today. Left
alone, Trending fragments into noise as soon as more than one person
posts. Constraining tags to a fixed list is what makes Trending, and any
future per-team page, actually work.

**It also has to happen before Session 7.** Seeding creates 15-20 picks.
Seed first and those picks get tagged inconsistently, and you'd be
cleaning up your own data afterward. Constrain the tags, then create the
data.

---

## Session 7 — Seed the feed, then invite real testers

**Goal:** five people who post without being reminded.

- [ ] Seed 15-20 of your own real picks. An empty feed gives a visitor
      nothing to react to, and you don't get a second first impression
      from the same person.
- [ ] Recruit 3-5 friends who **already bet and already text each other
      picks.** You're replacing an existing group chat, not creating a
      new habit. Five people posting daily beats 500 signups who never
      return.
- [ ] The pitch is the argument they're already having: every betting
      group has someone who claims they're up on the year and can't prove
      it. Gwuap is a public timestamped record where profit is computed
      from the odds posted *before* the game. "Post your picks, settle
      who's actually winning."
- [ ] Watch them use it. Take notes on where they hesitate and what they
      never touch. That's the real output of this session.

**Timing:** the NFL season opens the Thursday after Labor Day — the
single biggest betting moment of the American year. If the site is
working and seeded by opening weekend, you're launching into peak
interest. Miss it and the next comparable window is March Madness.

---

## Session 8 — Sports news tab

- [ ] Toggle on the feed: **Home** (user picks, current behavior) vs
      **News** (headlines for a chosen league). The `.chip-row` / `.chip`
      styles for the league picker already exist, unused, from Session 3.
- [ ] Pull headlines from free per-league **RSS feeds** (ESPN, CBS,
      Yahoo). No API key, no account, no monthly cost. Cache with Next's
      `revalidate: 900` — no database table, no cron.
- [ ] Show headline, source, timestamp, link out. **Do not** republish
      article body text.
- [ ] **The whole point of the feature:** a "Post a pick on this" button
      on every headline that opens the post form with the league
      pre-filled and the headline quoted. Otherwise a news tab is just an
      exit ramp to ESPN — you'd be paying attention to send traffic to a
      competitor. This turns reading into posting, and hands someone with
      nothing to say nine reasons to post.

**Budget boundary to hold:** headlines via RSS are free. *Structured*
sports data — live scores, odds, injury reports, player props — is a
different product with real pricing ($50-500/month, and some vendors
charge more for betting use). Decide deliberately before crossing that
line.

---

## Session 9 — DM requests

- [ ] Build the conversations/messages tables
- [ ] Build the request → accept/decline flow
- [ ] Build the actual message thread UI
- [ ] Rate-limit outbound requests (e.g. 10 pending per day)

**Decided:** StockTwits uses an open inbox — anyone can message anyone.
We're deliberately not copying that. On a site where people post losses
and get mouthy, an open inbox is a harassment vector and you're
moderating solo. Permission-based requests plus a rate limit stops spam
better than a paywall would, and costs users nothing.

---

## Session 10 — Chat rooms + Vent room

- [ ] Build the realtime chat room feature for league categories
- [ ] Build the Vent room specifically:
  - [ ] Exclude "Vent" from pick categories / leaderboard / win-loss tracking
  - [ ] Pin crisis resources at the top of the room (e.g. National Problem
        Gambling Helpline, 1-800-522-4700)
  - [ ] Pin visible room rules
  - [ ] Route reports from this room into a flagged, priority queue

---

## Session 11 — Polish round two, then a wider invite

- [ ] Fix whatever the first testers tripped over
- [ ] Re-enable "Confirm email" in Supabase with a real email provider —
      currently OFF, which is fine for five friends and not fine for
      strangers
- [ ] **Upgrade Next.js off 14.2.x.** That line stopped receiving
      security backports in May 2026, so `npm audit` will keep flagging
      issues no matter what. The jump to 15.x/16.x is a real breaking
      change (cookie/session handling API), not a quick bump — it needs
      its own session, and it needs to happen before any wider public
      audience.

---

## Reference: what we've already decided

- **Name:** Gwuap
- **Stack:** Next.js + Supabase (both free tier to start — $0/month)
- **Platform:** Mobile-first website, not a native app (native app is a
  possible "later" step once there's real traction — budget for it isn't
  the blocker, rebuild time is)
- **Design direction:** dark, mobile-first hybrid of StockTwits (cashtag
  pick tags, backing/fading sentiment, live ticker strip, trending
  module), Twitter/X (compact timeline, repost icon), and Instagram
  (avatar/image treatment) — bottom tab bar instead of a top nav
- **Money:** all amounts are US dollars. Dollar profit is derived from
  American odds × stake at grading time, never entered by hand, so a
  user's posted record always matches the prices they posted
- **Verification:** picks are self-reported. The "Unverified" badge was
  removed — it appeared identically on every post, so it carried no
  information. What actually backs the record is cheaper and real: a
  pick's terms are immutable once posted (column-level grants let the
  author change only `status` and `profit`), and every post carries a
  server timestamp. **To bring a badge back it has to mean something** —
  either a real connected sportsbook account, or proof the pick beat the
  opening whistle, which needs a schedule source we don't have yet
  Real verification (SharpSports API, connects to actual sportsbook
  accounts) is a paid, later-stage feature — not free, not urgent
- **Not doing yet:** live scores integration, native app, paid ads,
  monetization — all deliberately deferred until there's real traction
- **Verified badge policy:** "Verified" must always mean a real connected
  sportsbook account, never just a paid subscription — paid tiers (if
  added later) should be named and framed separately so money never buys
  the appearance of a trustworthy track record
- **Cashtags:** constrained to a fixed team list, not free text, so
  Trending and per-team views actually aggregate. Team codes are not
  canonical the way stock tickers are — we're picking a standard, so
  pick once and don't change it; every historical pick carries whatever
  we chose
- **No paywalls on access:** money must never buy a trustworthy-looking
  record, and it must never buy access to other users either. Paywalling
  DMs would select *for* touts selling picks, not against them — they're
  the only ones with an ROI case for paying. Monetization stays deferred
  until there's traction and we can see what people actually value
- **Moderation:** you're moderating everything yourself at first,
  especially the Vent room, until it's proven out

---

*Last updated after approving the mobile-first StockTwits/Twitter/Instagram
hybrid mockup. Update this file as we make new decisions so it stays the
source of truth.*
