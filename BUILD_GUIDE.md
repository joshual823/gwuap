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
- [x] Comment thread page (`/post/[id]`) — built in Session 6, with
      replies and reactions
- [x] Admin access — granted in Session 9, with a link in the header and
      a priority queue for Vent reports

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
- [x] Signup as a brand-new user and reactions both verified live via a
      second account (Session 9)
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

**Everything is built, deployed and live at https://gwuap.co.**
20 migrations run (001-020). Next.js 16, React 19, 0 vulnerabilities.
Security advisor: 0 errors.

**The only thing left is people.** The feed needs picks and the site
needs users. That has been the real blocker since Session 5 and no
amount of building has changed it.

### How to pick this up in a new terminal

```bash
cd ~/Desktop/chalk
claude --continue      # resumes the most recent conversation here
```

`claude --resume` instead gives a picker of older sessions. Every commit
message also carries a `Claude-Session:` URL if you want the web view.

Then say: **"read BUILD_GUIDE.md and tell me where we are"**.

### The workflow, every time

1. Claude writes code and commits locally
2. **If a migration is named, run it in the Supabase SQL editor FIRST**
3. Push from GitHub Desktop — CLI pushes have no stored credential
4. Pushing to `main` deploys to production automatically

**The single most common failure in this project** is a migration that
didn't run. The symptom is always the same: a feature that quietly does
nothing. `relation "x" does not exist` has bitten twice. If something
does nothing at all, suspect the migration before the code.

For anything visual or risky, work on a branch — Vercel builds a preview
URL and `main` stays untouched. That's how the Next.js 16 upgrade and the
rejected typography change were handled.

### What exists

**Posting** — picks with locked odds and auto-computed profit, takes
(cashtag + direction + text, no money), 8 bet types, over/under for
totals and props, neutral takes, matchup cashtags, quick-select odds and
stake chips.

**Cashtags** — 274 curated tickers across NBA/NFL/MLB/NHL/Tennis/UFC/
Boxing, plus anything previously posted, learned automatically. `/tag/LAL`
is a stream per team or player.

**Games** — live scoreboard across 11 leagues from ESPN, free, with
spreads and totals. Auto-scrolling rail on the feed, a Games tab, league
pages with live/soon/recent, and game pages with box scores, team logos,
the latest play and a live chat room.

**Social** — comment threads with replies, emoji reactions on posts and
comments, @ and $ autocomplete everywhere, notifications, permission-based
DMs with request/accept, follows, watchlists.

**Vent room** — realtime, signed-in only, crisis resources pinned,
reports jump the moderation queue.

**Trust** — posted odds are immutable, profit is computed not typed,
ungraded picks are shown publicly and keep you off the leaderboard.

**Chrome** — light/dark following the OS with a manual toggle, profile
pictures resized in-browser, news carousel, search across people and
cashtags, moderation tools, Vercel Analytics and Clarity heatmaps.

### Known gaps, deliberately

- **Image moderation.** Avatars are allowed because they're one per user
  and easy to clear. Bet-slip uploads and chat GIFs stay off until
  there's a moderation story. Revisit before a wider public launch.
- **Email confirmation is OFF.** gwuap.co has no sending reputation yet,
  so resets land in spam. A spam-foldered confirmation kills signups
  silently. Turn it on when you post the link somewhere you can't text
  the person.
- **Leaked-password protection** is Pro-plan only; minimum length is 8
  instead.
- **Block and ban filtering covers the feed only.** Profile pages and
  direct post links still render for blocked or banned users.
- **Auto-grading is live and verified** (3 Sep 2026). `CRON_SECRET` is
  set in Vercel Production, the cron shows as `/api/grade · 0 8 * * *`
  under Settings → Cron Jobs, and the self-grading revoke checks out:
  `authenticated` has no UPDATE on `posts` at all.
  To re-check the revoke after any schema change:
  ```sql
  select privilege_type, column_name
  from information_schema.column_privileges
  where table_name = 'posts' and grantee = 'authenticated'
    and privilege_type = 'UPDATE';
  ```
  Any row means self-grading is open again. Note the broader query
  without the UPDATE filter returns ~72 rows and proves nothing —
  SELECT and INSERT are supposed to be there.
- **Picks the grader refuses now say why** and land in a review queue at
  the top of `/admin`. `gradePick` returns `{outcome}` or `{blocked}`;
  `needsReview()` separates "the game hasn't finished" from "this will
  sit pending forever". Before a cash prize, silence was survivable;
  with one, a pick that never grades and never explains itself reads as
  the contest being rigged.
- **`SUPABASE_SERVICE_ROLE_KEY` must exist in Vercel Production.** It was
  missing until 3 Sep 2026 and nothing noticed, because only two things
  use `createAdminClient()`: the grading job and admin ban/remove. The
  moderation buttons would have thrown a 500 the first time they were
  pressed. If either ever fails oddly, check this variable first.
  Re-adding it: delete and re-create rather than edit — the value box
  shows a masked placeholder, and saving over that stores an empty value.
- **Hourly grading runs from GitHub Actions**
  (`.github/workflows/grade.yml`), because Hobby refuses sub-daily crons.
  Needs `CRON_SECRET` in the repo's Actions secrets, matching Vercel's.
  The Vercel daily cron stays as a backstop; running both is safe because
  `/api/grade` only ever moves a pick out of 'pending'. The workflow
  fails loudly on any non-200 — a 401 means the two secrets disagree, and
  a silent pass there would look identical to working.
- **Self-graded records say so.** Picks settled before auto-grading carry
  `graded_by = 'user'` and now render a "self-graded" stamp, with a count
  on the profile header. The header is what gets screenshotted, and a
  100% win rate with no provenance is the exact claim this site says it
  doesn't accept.
- **A held pick says so on the card.** Everyone sees an "under review"
  stamp; the author also gets the reason. Attached by
  `lib/gradeNotes.ts` in its own query rather than folded into the post
  selects — those build the feed and every profile, and adding a column
  to them breaks the page until the migration runs.
- **An admin cannot grade their own pick.** Enforced in
  `/api/admin/grade`, not in the UI, and the button is replaced by an
  explanation rather than hidden. There is one admin who may enter their
  own contest, so this is the accusation the prize invites — refusing it
  in code makes the answer verifiable.
- **Manual grading uses the service role**, never a grant. Granting
  update on posts back to `authenticated` would reopen the self-grading
  hole 022 closed, so the exception lives behind an is_admin check in a
  route instead.
- **The launch contest lives in `lib/contest.ts`** — prize, deadline and
  minimum picks in one place, because they appear on the banner, the
  contest page and the share card. Change the date there and everything
  follows. The banner hides itself once `hasEnded()`.
- **Share previews are generated, not stored.** `app/opengraph-image.tsx`
  renders a 1200×630 PNG at build from the same constants, so the prize
  on the card can't drift from the prize on the site. `metadataBase` in
  `app/layout.tsx` is what makes the tag absolute — without it messaging
  apps drop the image silently and the link still previews, just with no
  picture, which is easy to miss.
- **No migration needed for the contest.** It reads the existing
  leaderboard view.
- **Feed preferences (migration 023).** Up to 3 leagues per profile,
  chosen at signup and editable from Edit profile. Null/empty means the
  default mix, so nothing changed for existing accounts and logged-out
  visitors are unaffected. The rail and the news carousel put chosen
  leagues first and then *always* backfill with the default mix — a
  literal filter would give someone who picks NFL, College Football and
  NBA an empty rail every June, which is the dead feed the scoreboard
  exists to prevent. `npm test` covers that case.
- **Adding a profile column? Read it in its own query.** Folding one into
  the main profile select breaks that query until the migration runs, and
  because it gates `notFound()`, every profile page on the site 404s.
  Caught exactly that during 023.
- **Hobby caps crons at once per day.** A more frequent expression fails
  the deployment outright, so grading runs at 08:00 UTC with a one-hour
  flexible window. On Pro this becomes hourly by editing one line in
  `vercel.json`. Nothing else changes.
- **`/api/grade` returns 503 without `CRON_SECRET`** rather than falling
  open, since it writes to every record on the site. That also makes it
  testable from outside: an unauthenticated request answering 401 rather
  than 503 proves the variable is set, without knowing its value.
- **Props, parlays and futures are never auto-graded** and don't count
  toward the leaderboard. No scoreline says whether a parlay's third leg
  hit. They stay postable and stay on profiles.
- **Picks made before migration 022 have no `game_id`**, so they can't be
  auto-graded and don't rank. They age out of the 30-day window on their
  own; the ones already graded are marked `graded_by = 'user'`.
- **Fonts.** Now Inter, one family everywhere, matching Polymarket —
  their markup references Inter and no other face. Headings are 700, not
  800. The `--font-display` and `--font-mono` tokens still exist and
  point at the body face, so a future change is two lines in
  `app/layout.tsx` plus the tokens, not a sweep through components. The
  earlier rejected Manrope/Inter pairing is still on `typography-preview`.
- **Tennis has no ESPN summary endpoint.** `summary?event=` takes
  tournament event ids; tennis matches are competitions nested under
  `groupings`. Detail pages fall back to the scoreboard row. Any sport
  ESPN drops summary support for degrades the same way instead of 404ing.
- **SofaScore and Tenipo are not usable as sources.** SofaScore's API
  answers 403 to any server request regardless of headers, and Tenipo is
  behind a Cloudflare bot challenge. Both were tested. Getting past them
  means defeating bot protection, which breaks silently and often. The
  scoreboard payload ESPN already returns carries most of the same
  material, so that's where the tennis detail comes from: country flags,
  draw and round, court, tiebreak scores and ESPN's own result line.
- **What tennis still lacks** is live point-by-point — the 15/30/40
  within a game, and who's serving. ESPN doesn't publish it. That needs
  a paid feed (api-tennis.com, api-sports.io) and is the only reason to
  add a provider.

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

### Session 6e — moderation tools that actually work

**No migration.** The database already allowed all of this; the app just
never called it. Push and it's live.

- [x] **Delete your own pick.** There was no button anywhere — the RLS
      policy permitted it, nothing invoked it. Now behind a ⋯ menu on
      every card, with a confirm step. You'll want this while seeding.
- [x] **Report a specific pick.** Reports could only name a *user*, from
      their profile, so `reported_post_id` was always empty — which meant
      the admin panel's "Remove post" button had nothing to act on and
      **never rendered at all.** Reporting a post now fills in both ids,
      so that button works.
- [x] **Blocking does something.** `ProfileActions` wrote to the `blocks`
      table and the feed never read it, so a blocked user's picks kept
      appearing. The feed now filters them out.
- [x] **Banning does something in the feed.** `is_banned` was only
      respected by the leaderboard — a banned user's posts stayed in
      everyone's timeline. The feed now excludes them.
- [x] **A link to `/admin`**, shown only to admins. It was URL-only
      before, with nothing pointing at it.

**How to become an admin:** `is_admin` defaults to false, so `/admin`
says "Not authorized" until you run:
```sql
update profiles set is_admin = true where username = 'YOUR_USERNAME';
```

**What `/admin` is and isn't:** it's a queue of open reports with three
buttons — Dismiss, Remove post, Ban user. It is not a content browser.
For general adding and deleting, use Supabase's **Table Editor**, which
bypasses RLS and is the right tool at this scale.

**Known limit:** block and ban filtering is applied to the **feed only**.
A banned or blocked user's profile page, and a direct link to one of
their posts, still render. The feed is the surface that matters at five
users; worth extending before a wider audience.

---

### Session 8b — takes, and news with pictures

**Run `supabase/migrations/005_takes.sql` before pushing.**

- [x] **News now carries a thumbnail on every story.** ESPN's RSS has no
      per-article image — the one `<image>` tag in it is the channel
      logo. CBS Sports' feed attaches an `<enclosure>` image to every
      item and covers all twelve categories, so CBS is now the primary
      source with ESPN as an automatic fallback if a CBS feed errors or
      comes back empty. Still $0: the images are hotlinked from CBS's
      CDN, and they're plain `<img loading="lazy">` rather than
      `next/image`, which is metered on Vercel.
- [x] **Takes** — a post with no bet on it. Cashtag + league + Backing or
      Fading + something to say. That's the StockTwits shape: nobody
      there attaches a trade, they attach a symbol and a direction.
      Tapping **+** opens a Take by default; a Take/Pick toggle at the
      top switches to the full bet slip.
- [x] Takes feed Trending and the ticker like any other post, which is
      where the site gets its sense of a live room.
- [x] **Sentiment is now a required choice, not a silent default.** It
      used to default to Backing, which meant an unconsidered post still
      counted as bullish and quietly skewed Trending.

**The part that matters: takes can never touch the record.** Hiding the
grade buttons isn't enough — the anon key ships in every browser. The
migration adds database CHECK constraints so a take must stay `pending`
and must carry no odds, stake, profit, or payout. If a take could be
marked a win it would enter the leaderboard as a free victory and make
every record on the site meaningless. The leaderboard view also filters
on `post_kind = 'pick'` explicitly.

**Judgment call worth knowing:** a take requires caption text. You only
specified cashtag, league, and sentiment as mandatory — but without odds
or a stake, a take with no words is just a bare cashtag with nothing to
react to. Easy to reverse if you disagree.

**Profile** now reads "12 picks · 34 takes", and the record and profit
figures count picks only.

---

### Session 8c — Over/Under, matchup cashtags, faster posting

**Run `supabase/migrations/006_directions_and_matchup.sql` before
pushing.**

- [x] **Direction now follows the bet type.** Backing/Fading maps onto a
      team; it means nothing on a total — you're not backing the Giants,
      you're taking the Over on a game. Totals, player props and team
      props now show **Over / Under**. Everything else, and all takes,
      keep Backing / Fading.
- [x] The real value is stored, not Backing wearing an "Over" label, so
      Trending can say "68% over on $SF" and mean it. The constraint on
      `sentiment` was widened to four values.
- [x] Changing bet type clears a direction that no longer applies,
      rather than silently posting a stale one.
- [x] **Optional opponent cashtag for totals** (`tag2`). A total sits on
      a game, so one tag was lossy — a Giants/Padres total now surfaces
      under both teams in Trending.
- [x] **Quick-odds chips**: −110 · −120 · +100 · +120 · +150 · +200.
      Most spreads and totals are −110, which was already the default,
      so the common case is now zero typing.
- [x] **Last league and last stake are remembered** in the browser, so
      your second post of the day is faster than your first. Wrapped in
      try/catch — private mode and blocked storage must not break the
      form.

**Why there's no live odds feed, decided here:** The Odds API's free tier
is 500 *credits* a month, and a credit isn't a request — a call costs
markets × regions. Refreshing hourly for a **single** league is ~720
calls/month, so one sport would blow the free tier, never mind twelve.
Paid starts around $149/month. Scraping a sportsbook breaks constantly
and is against their terms. The Vercel Marketplace has no sports-data
category. Revisit only with traction and a budget; the quick-odds chips
get most of the speed for nothing.

---

### Session 8d — form reorder + a bug the reorder exposed

**No migration.**

- [x] **Bet type is now the first question.** Previously it sat below the
      cashtag and direction, so choosing Total *after* answering them
      wiped the direction — which read as "everything cleared". Asking it
      first means the direction buttons and the opponent field are
      already correct, and nothing downstream ever has to be re-answered.
      Order is now: Take/Pick → Bet type → League → Cashtag (+ opponent
      on totals) → Which way → Text → Odds → Stake.
- [x] **Odds match the stake pattern**: chips, with the typed input
      hidden behind Custom. -110 is preselected, so the most common bet
      on the board needs no typing at all.
- [x] **Fixed: the opponent cashtag was never saved.** The pick insert
      had no `tag2` field — an earlier edit didn't match the real text
      and silently did nothing, so anything typed there was discarded on
      submit. Found by reading the file rather than by testing, which is
      the point: a silent no-op looks identical to working.
- [x] The pick insert now also sets `post_kind` explicitly instead of
      relying on the column default, and trims the caption.

---

### Session 8e — the cold-visitor pass

A review of everything a stranger touches before they have an account.
**No migration.**

- [x] **Signup could permanently lock someone out.** It created the auth
      account first, then inserted the profile. A taken username failed
      the insert and said "try another" — but the email was already
      registered, so resubmitting failed with "User already registered"
      forever. That email became unusable. Now the username is checked
      *before* the account is created, and if someone claims the name in
      the gap, the half-made account is signed out rather than stranding
      them.
- [x] **`/post/new` was fully usable logged out.** A visitor could fill
      in bet type, league, cashtag, direction, text, odds and stake, hit
      post, and get bounced to login with all of it gone. It now
      redirects up front, with `?next=` so login returns you there.
- [x] **Password reset now exists.** There was none — forget your
      password and you were locked out for good. `/reset` requests a
      link, `/auth/callback` exchanges the code for a session, and
      `/reset/confirm` sets the new one, with a clear message for expired
      links. The request page always reports success, so nobody can use
      it to test which emails are registered.
- [x] **Search finds cashtags.** It only searched usernames, so on a site
      organised around cashtags, searching `$LAL` returned nothing.
      Now it searches people and picks, with a real empty state instead
      of a blank void.
- [x] **`/profile/nosuchuser` returned HTTP 200** with "User not found."
      It's a real 404 now.
- [x] Signup states its username and password rules instead of leaving
      the browser to say "match the requested format", and Supabase's
      raw error strings are translated into plain English.

**Caveat on password reset:** it depends on Supabase sending email. The
built-in sender works but is rate-limited on the free tier — fine for a
handful of testers, not for a public launch. That's the same decision
already sitting in Session 11 (a real email provider), and it now covers
resets as well as confirmations.

---

### Session 8g — Next.js 16, grading integrity, logout

**Run `supabase/migrations/007_grading_integrity.sql` before merging.**

- [x] **Upgraded Next.js 14.2.35 → 16.3.4, React 18 → 19.** `npm audit`
      now reports 0 vulnerabilities; 14.2.x had been off security support
      since May 2026. Done before DMs and chat rooms on purpose — the
      async `cookies()` change touches every server component, so the
      migration gets more expensive with every feature added on 14.x.
      Nine files today; closer to twenty later.
      - `createClient()` in `lib/supabaseServer.ts` is async now, and all
        nine server-side callers await it
      - `params` and `searchParams` are promises
      - `middleware.ts` → `proxy.ts` (Next 16 convention)
      - `next lint` was removed from Next; the script is gone
      - Turbopack is the default builder
      - **Done on a branch with a Vercel preview URL**, not straight to
        main. Worth repeating for anything that replaces the framework,
        React, or auth at once.
- [x] **Closed the selective-grading hole.** The obvious cheat is marking
      a loss as a win. The easy one was never grading losses at all — the
      leaderboard only counted win/loss picks, so 50 picks with the 20
      winners graded and 30 left pending read as a **100% win rate**
      without a single lie. Now: picks pending over 7 days count as
      *ungraded* and are shown publicly on profiles and the leaderboard,
      and you need at least 80% of your settled picks graded to rank at
      all. Your own profile nudges you with what's outstanding.
- [x] **Added a log out button.** There wasn't one anywhere — the only
      `signOut` in the codebase was an error path inside signup.

**Deliberately kept:** the grade buttons. Removing them would mean
nothing ever gets graded, which kills the record, the leaderboard and the
profit tracking — the whole product. The fix is making dishonesty
visible, not removing the honest path.

**Where this ends up:** auto-grading from a results feed removes
self-reporting entirely. ESPN publishes a free undocumented scoreboard
JSON that could grade moneyline, spread and totals for the major
leagues. The hard part isn't scores, it's matching a free-text pick to a
specific game — that needs game IDs captured at post time rather than
cashtags. A real feature, not a session. Beyond that is the sportsbook
sync that should be the only thing to ever earn a "Verified" badge.

---

## Session 7 — Seed the feed, then invite real testers

**Goal:** five people who post without being reminded.

- [ ] Seed 15-20 of your own real picks. An empty feed gives a visitor
      nothing to react to, and you don't get a second first impression
      from the same person.
- [ ] **Distribution, given no friend group to draw on.** The
      "recruit a group chat" advice doesn't apply here, so ignore it.
      What works for a solo founder with no network is being a public
      bettor with receipts: post your picks in r/sportsbook daily
      threads, a betting Discord, or on X — *and* on Gwuap — then let
      your Gwuap profile be the proof. "Tracked record here" is a link
      with a reason to click, not a promo drop. Those communities bury
      link-drops but tolerate a regular who posts real picks and real
      losses. It's slower than five friends. It's what's available.
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

## Session 8 — Sports news tab ✅ DONE

- [x] Toggle on the feed: **Home** (user picks, current behavior) vs
      **News** (headlines for a chosen league). The `.chip-row` / `.chip`
      styles for the league picker already exist, unused, from Session 3.
- [x] Pull headlines from free per-league **RSS feeds** (ESPN, CBS,
      Yahoo). No API key, no account, no monthly cost. Cache with Next's
      `revalidate: 900` — no database table, no cron.
- [x] Show headline, source, timestamp, link out. **Do not** republish
      article body text.
- [x] **The whole point of the feature:** a "Post a pick on this" button
      on every headline that opens the post form with the league
      pre-filled and the headline quoted. Otherwise a news tab is just an
      exit ramp to ESPN — you'd be paying attention to send traffic to a
      competitor. This turns reading into posting, and hands someone with
      nothing to say nine reasons to post.

**No migration.** It's all read-only fetching; nothing new is stored.

**What shipped:** Home / News tabs on the feed, a league chip row on
News covering all 12 categories (ESPN's `mma` feed serves UFC, `boxing`
is separate, `tennis` too), and a "Today in sports" module with three
headlines on Home. Every headline carries a **Post a pick on this**
button that opens the form with the league preselected and the headline
dropped into the caption. The Home timeline itself stays real picks only
— a timeline of auto-posted headlines reads as a bot aggregator and
makes a site look more dead, not less.

**Implementation notes:** all 12 ESPN feeds were verified returning live
content before shipping. The RSS parser is ~30 lines in `lib/news.ts`
rather than an npm dependency — RSS is predictable enough, and it keeps
the bundle and the supply chain small. `fetchNews` returns `[]` on any
failure, so a feed going down can never take the page with it. Caching
is Next's `revalidate: 900`, so each feed is pulled at most four times an
hour regardless of traffic.

**Caught after the first deploy:** `/feed` returned the signed-out
landing page before any tab logic ran, so the News tab was invisible to
logged-out visitors — the exact people it was built for. News is now
public: a cold visitor can browse headlines without an account, the
landing page links to it ("Just looking? Browse today's headlines"), and
a sign-up nudge sits above the list. Worth remembering as a pattern:
anything meant to hook a stranger has to be reachable *before* signup.

**Budget boundary to hold:** headlines via RSS are free. *Structured*
sports data — live scores, odds, injury reports, player props — is a
different product with real pricing ($50-500/month, and some vendors
charge more for betting use). Decide deliberately before crossing that
line.

---

## Session 9a — Notifications ✅ DONE

**Run `supabase/migrations/008_notifications.sql` before pushing.**

- [x] `notifications` table covering reactions, comments, replies and
      follows, with a real unread badge on a bell in the header — the
      badge used to be a hardcoded "2" next to a link that 404'd.
- [x] `/notifications` page, newest first, unread highlighted. Opening
      the page marks everything read; there's no button, because opening
      it *is* the acknowledgement.
- [x] Un-reacting removes the notification, so you don't get pinged for
      a reaction that no longer exists.
- [x] Self-actions never notify — reacting to your own post, replying to
      yourself, and so on.

**The design decision that matters: rows are written by database
triggers, never by the app.** If the client inserted them, every
signed-in user would need permission to write rows addressed to *other
people*, and there's no RLS policy that makes that safe — it's a spam
vector by construction. The triggers run as the table owner, so the
client has SELECT, UPDATE and DELETE on its own notifications and **no
INSERT at all.** Nobody can fabricate a notification.

Reactions notify on INSERT only, so switching your emoji doesn't fire a
second ping.

**Built before DMs on purpose:** DMs need somewhere to notify into.
Building them first would have meant retrofitting this.

---

### Session 9c — profile editing, and a privilege-escalation fix

**Run `supabase/migrations/009_profile_editing.sql` before pushing.**

- [x] **Fixed: profile tab showed a login form for ~30 seconds after
      logging in.** The root layout is cached by the client router, so
      after login it kept rendering the logged-out state — including
      `profileHref = '/login'` — until the cache went stale. Login and
      signup now call `router.refresh()` after navigating, which
      invalidates it. Logout already did this.
- [x] **Edit your profile** — username, display name and bio, on your own
      profile. A rename navigates to the new URL. Availability is checked
      before saving, and the unique index catches anyone who claims the
      name in the gap.
- [x] **Usernames are now case-insensitively unique.** The index on
      `lower(username)` existed but wasn't unique, and `username text
      unique` is case-sensitive — so "Josh" and "josh" could both exist.
      On a site where your handle is your reputation, that's an
      impersonation vector.
- [x] **Fixed a privilege-escalation hole.** The policy "users can update
      own profile" allowed updating **any** column, including
      `is_admin` and `is_banned`. The anon key ships in every browser, so
      a signed-in user could PATCH their own row, make themselves an
      admin, and then delete posts and ban people. Column-level grants
      now limit users to username, display_name, bio and avatar_url;
      moderation flags are service_role only, which is what the admin
      panel already uses.

**Pattern worth noticing:** this is the third time an RLS policy turned
out to be too broad — posts (odds could be edited after the game),
notifications (would have been forgeable if the client inserted them),
and now profiles. **RLS controls which rows you can touch, never which
columns.** Any time a table has a column users must not set, it needs
column-level grants as well as a policy.

---

### Session 9d — profile pictures

**Run `supabase/migrations/010_avatars.sql` before pushing.**

- [x] Upload a profile picture from Edit profile. 2MB cap, images only.
- [x] One `Avatar` component used by post cards, comments, the
      leaderboard, search and the profile header — so a picture shows up
      everywhere rather than only where someone remembered to handle it.
      Falls back to the gradient placeholder.
- [x] Files go to `avatars/<your user id>/…` and the storage policy only
      permits writes inside your own folder, so nobody can overwrite
      someone else's picture.
- [x] Display name is shown on the profile now — it was editable and
      stored but never rendered anywhere.

- [x] **Pictures are resized in the browser before upload.** The 2MB
      limit is gone — any size works. The image is centre-cropped square
      and scaled to 512px, so a 6MB phone photo becomes about 50KB.
      Nobody has to shrink a file themselves.

**How the resize works, and why it's free:** a canvas draw in the
browser, no library. The original never leaves the device, so uploads
are fast on a phone connection and nothing large touches storage. EXIF
orientation is honoured via `createImageBitmap`, so photos taken sideways
don't come out rotated. Output is JPEG — every browser can encode it, and
at 512px the saving from WebP is a few kilobytes.

**Upload rather than a URL field, on purpose:** a pasted URL can have its
contents swapped after anyone has looked at it. An uploaded file can't.

**Moderation, stated honestly:** an avatar is *more* exposed than the bet
slip uploads removed in Session 6b — it sits beside every post and
comment its owner makes, plus search and the leaderboard. The same
concern applies, more strongly. What makes it acceptable for now is that
it's one image per user rather than one per post, so it's bounded:
clearing `avatar_url` in the Table Editor, or banning the account (which
already hides their posts), fully resolves it. **Revisit before inviting
strangers** — at that point either image moderation or an approval step
belongs here, and it would cover slip uploads too.

---

## Session 9b — DM requests ✅ DONE

**Run `supabase/migrations/011_direct_messages.sql` before pushing.**

- [x] `conversations` and `messages` tables
- [x] Request → accept/decline flow
- [x] Thread UI, an inbox split into Requests / Conversations / Sent,
      and a Message button on other people's profiles
- [x] Rate limit: 10 pending outbound requests per day
- [x] An ✉️ in the header counting unread messages plus pending requests,
      and DM notifications that deep-link to the thread

**Design decisions worth keeping:**

*The pair is stored in a canonical order* (`user_a < user_b`) with a
unique constraint, so A→B and B→A can't become two separate threads —
the classic duplicate-conversation bug.

*While a request is pending only the requester can write.* The recipient
reads it and decides without being talked at, which is the whole point of
permission-based DMs.

*Blocks and the rate limit are enforced by a trigger, not a policy.* A
user can't read someone else's block list through RLS, so the check
can't live in a policy — and a rate limit in a policy would be trivially
bypassed. The trigger runs as the table owner.

*Column-level grants again* (fourth time): users may update only
`conversations.status` and `messages.read_at`. Without that, anyone
could rewrite `last_message_at` to pin themselves to the top of every
inbox, or edit someone else's sent message.

**Not built, deliberately:** realtime. Messages appear on refresh, not
instantly. Supabase Realtime would fix it and belongs with chat rooms in
Session 10, where it's needed anyway — no point building the plumbing
twice.

**Decided:** StockTwits uses an open inbox — anyone can message anyone.
We're deliberately not copying that. On a site where people post losses
and get mouthy, an open inbox is a harassment vector and you're
moderating solo. Permission-based requests plus a rate limit stops spam
better than a paywall would, and costs users nothing.

---

## Session 10 — Cashtag pages + Vent room ✅ DONE

**Run `supabase/migrations/012_tickers_and_vent.sql` before pushing.**

**League chat rooms were dropped.** The idea came from Polymarket, where
people talk under a specific market. What makes that work is a *shared
object* with conversation attached — the market — not the chat itself.
Twelve league rooms with nobody in them would have felt deader than no
rooms at all.

The shared object here already existed: the cashtag. What was missing was
a page for it.

### Cashtag pages

- [x] `/tag/LAL` — every pick and take on a team or player, newest first,
      with the sentiment split across the top and a Post button that
      pre-fills the ticker.
- [x] **Cashtags are links now.** They were plain text in post cards,
      Trending rows and the ticker strip — three dead ends on every page.
- [x] **Fixed a second fragmentation bug.** `tag` stores the whole string
      ("$LAL -4.5"), and Trending grouped on it exactly — so "$LAL -4.5"
      and "$LAL -3.5" counted as two different trends. The autocomplete
      fixed *case* fragmentation in Session 6; this is the *line*. A new
      `ticker` column is derived by trigger from the tag, so it can't
      drift, and Trending and cashtag pages both group on it.

**Not built: realtime.** Polymarket feels alive because thousands of
people are on one market, which is volume rather than technology.
Realtime on an empty room is an empty room that updates instantly. Worth
adding once there's traffic — the plumbing would serve Vent too.

### Vent room

- [x] `/vent`, signed-in only — people say hard things there and it
      shouldn't be readable by passers-by or indexable
- [x] A separate table rather than a post category, so it's
      *structurally* incapable of reaching picks, the leaderboard or
      anyone's record
- [x] Crisis resources pinned at the top: National Problem Gambling
      Helpline 1-800-522-4700 (call or text, 24/7), ncpgambling.org/chat,
      and 988 for self-harm. US only for now.
- [x] Room rules pinned: no bullying (permanent ban), no racism or hate
      speech
- [x] Reports from this room go to the top of the moderation queue and
      are flagged there. A report counts as a Vent report if and only if
      it points at a vent message — there's no priority flag a client
      could set on an ordinary report.
- [x] Delete your own message; report anyone else's

### Session 10b — the Vent room is live

**Run `supabase/migrations/013_vent_realtime.sql` before pushing.**

- [x] Messages appear instantly, no refresh — Supabase Realtime on
      `vent_messages` only. Deletions disappear too.
- [x] **Presence**: "3 people here right now", or "You're the only one
      here right now".
- [x] **A quiet state.** When you're alone and nothing has been posted
      for two hours, the room says so and points at the helpline instead
      of pretending.

**Why realtime here and nowhere else:** a live-chat interface *implies
someone is listening*. In a room for people having a bad night, that's a
promise — and if nobody's online, breaking it is worse than a message
board would have been, because they expected a reply. So the room is
live, and it's also honest about whether anyone is in it. The presence
indicator isn't decoration; it's the part that keeps the interface from
lying.

Realtime everywhere else still waits for traffic. The plumbing is proven
now, so adding it to cashtag pages later is small.

## Session 11 — Polish round two, then a wider invite

- [ ] Fix whatever the first testers tripped over
- [ ] Re-enable "Confirm email" in Supabase with a real email provider —
      currently OFF, which is fine for five friends and not fine for
      strangers
- [x] **Next.js upgraded to 16.3.4 / React 19** (Session 8g). Done early
      rather than last, because the async `cookies()` change touches every
      server component and gets more expensive with each feature added on
      14.x. `npm audit` reports 0 vulnerabilities.

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
