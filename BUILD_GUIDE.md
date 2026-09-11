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
6. Make it not broken — dead links + cashtag autocomplete ✅
7. Seed the feed, then invite the first real testers ✅ (feed seeded; the
   inviting is the part that hasn't happened)
8. Sports news tab, with a "post a pick on this" button ✅
9. DM requests (permission-based) ✅
10. League chat rooms + the moderated Vent room ✅
11. Polish round two, then a wider invite ← **current step, and it is
    the invite half that's outstanding, not the polish**

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
41 migrations run (001-041). Next.js 16, React 19, 0 vulnerabilities.
Security advisor: 0 errors.

**The only thing left is people, and the numbers say so plainly.**
As of 7 Sep 2026:

| | |
|---|---|
| Accounts | 6 (5 people, 1 house model) |
| Posts | 125 — **106 of them the house model**, 19 from people |
| Picks settled by the scoreboard | 53 win/loss, 53 still pending |
| On the leaderboard (5+ settled) | 2: @gwuap 17-25, @jbreezy823 2-3 |

Read the second row before building anything else. Five sessions of
features have not moved it, and a timeline that is 85% one automated
account is not a feed — it's a demo. The house model was cut from two
picks an hour to one every three hours on 7 Sep for exactly this reason.

The grading loop is real and running: 53 picks have been settled from
final scores with nobody able to grade their own. That is the thing the
site is for, and it works. What it lacks is people to point it at.

### State at the last checkpoint — 7 Sep 2026, 21:30

Everything below was true when this was written. Re-read the numbers
before trusting them.

- **Working tree clean.** All work committed.
- **`origin/main` has** everything through `594b148` — the contest
  removal, the green unification, the house-account slowdown, the
  scorecard fix and the graded-pick notifications are all deployed.
- **One commit waiting to push:** `283c940`, this guide's refresh, plus
  whatever follows it. Push from GitHub Desktop.
- **No migration is pending.** All 41 are live. 040 and 041 were run on
  8-9 Sep and both verified — 040 by the privileges query returning zero
  rows, 041 by saving a bio on the site, which is the only check that
  proves the thing people actually do.
- **A dev server may still be running** on localhost:3000 from the last
  session. It dies with the terminal; `npm run dev` brings it back.
- **The graded-pick email can be read without sending one.** The digest
  moved out of the route into `lib/digest.ts`, which is pure — rows in,
  subject/HTML/text out, nothing on the network. `lib/digest.test.ts`
  covers it. Still not *sent* end-to-end: see the Resend note below.

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
5. **Update this file in the same commit as the change it describes.**

Step 5 is not optional and not a tidy-up at the end of a session. This
file went 19 migrations and four days out of date, and the cost wasn't
untidiness — it was that "the only thing left is people" sat at the top
for five sessions while feature after feature got built underneath it. A
guide that describes an older, smaller site is worse than no guide,
because it's trusted.

What counts as worth writing down:

- **Any migration.** Its number, what it changes, and why. If it can't be
  re-run safely, say so.
- **Any change to the site** someone would notice — a feature, a removal,
  a rule about what's allowed, a fix whose reason isn't obvious from the
  code.
- **Any advertising or growth attempt**, which is the one this file has
  never recorded: what was tried, where, what it cost, and what came
  back. Steps 1-4 above are how code reaches production; nothing has ever
  described how a person reaches the site. Given that the outstanding
  blocker is people and not features, an untried channel and a channel
  that was tried and failed need to be told apart, and only this file can
  do it.
- **Anything learned the hard way**, especially a failure whose symptom
  didn't match its cause. Those are the entries that have paid off most.

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

**Grading** — picks are settled from the final score by a job that runs
hourly, never by their author. A refusal is recorded with a reason and
queued at the top of `/admin` rather than left pending in silence. Picks
posted more than five minutes after kick-off are void, and a pick can't
be deleted once its game starts.

**The house model** — one labelled `is_bot` account posting a pick every
three hours from real book prices, so the timeline is never empty. It's
graded like everyone else, its record is public and often losing, and it
appears on the leaderboard marked MODEL. It is not a person and never
pretends to be.

**Email** — a Resend-backed digest, one per person per run, hourly from
GitHub Actions. Covers reactions, comments, replies, follows, reposts, DM
requests and graded picks; a graded row names the pick and links straight
to it. A welcome email goes once, stamped only after it actually sends.
Turned off per account under Edit profile.

**Receipts** — the day's settled picks rendered as one shareable image
(`/receipts`), and a per-post OG card, both generated at request time
from the same constants the site uses.

**Badges** — `founding` for the first 200 accounts, awarded by a trigger
so the cap holds however an account is made. Deliberately outside the
`authenticated` update grant: a badge you can give yourself is a
decoration, not a record.

**Trust** — posted odds are immutable, profit is computed not typed,
ungraded picks are shown publicly and keep you off the leaderboard, an
admin cannot grade their own pick, and money on a pick can be kept
private without hiding the pick itself.

**Chrome** — light/dark following the OS with a manual toggle, profile
pictures resized in-browser, news carousel, search across people and
cashtags, moderation tools, Vercel Analytics. **Clarity is installed but
has never recorded anything — see the 11 Sep entry before trusting it.**

### Known gaps, deliberately

- **Image moderation — partly resolved (048).** Avatars were always
  allowed: one per user, easy to clear. **Squad rooms now take pictures
  and GIFs**, because squads are the moderation story this was waiting
  for: the room is members-only under RLS, so a picture is seen by people
  who chose to be there rather than by the public timeline; the owner can
  already delete any message in their own room (042), so every room has
  somebody who can clear it without the one site admin; and a GIF isn't
  uploaded at all, it's a link to GIPHY, rated by GIPHY.
  **Bet-slip uploads on public posts stay off** — none of the above is
  true of the feed.
- **Email confirmation is OFF.** gwuap.co has no sending reputation yet,
  so resets land in spam. A spam-foldered confirmation kills signups
  silently. Turn it on when you post the link somewhere you can't text
  the person. Note this is separate from the notification digests, which
  do send, through Resend on a verified domain.
- **Advertising has run, and this bullet used to deny it.** A Reddit
  Traffic campaign spent $52 between 4 and 10 Sep 2026 — 7,245
  impressions, 58 clicks — while this line said nothing had been
  advertised. It is paused now. What it served and what it means is in
  Advertising → "The Reddit campaign had been running for six days".
  **The signups it produced have still not been counted**, which is the
  actual outstanding item: the clicks are known and their result isn't.
- **Leaked-password protection** is Pro-plan only; minimum length is 8
  instead.
- **`vercel env pull` cannot retrieve `RESEND_API_KEY`, `CRON_SECRET` or
  `SUPABASE_SERVICE_ROLE_KEY`.** All three are marked **Sensitive** in
  Vercel, which makes them write-only by design — a pull writes
  `[SENSITIVE]` as a placeholder and says so in a line that's easy to
  scroll past. This is a Vercel feature, not a login problem, and no
  amount of re-authenticating changes it. To run those paths locally,
  paste the value in by hand or mint a fresh one (a second Resend key is
  free and revocable, and is the safer move anyway). The three that
  aren't sensitive — `RESEND_EMAIL_DOMAIN`, `NEXT_PUBLIC_REDDIT_PIXEL_ID`,
  the Supabase URL/anon key — do come down fine.
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
  sit pending forever". A pick that never grades and never explains
  itself reads as the board being rigged, and the board is the product.
- **`SUPABASE_SERVICE_ROLE_KEY` must exist in Vercel Production.** It was
  missing until 3 Sep 2026 and nothing noticed, because only two things
  use `createAdminClient()`: the grading job and admin ban/remove. The
  moderation buttons would have thrown a 500 the first time they were
  pressed. If either ever fails oddly, check this variable first.
  Re-adding it: delete and re-create rather than edit — the value box
  shows a masked placeholder, and saving over that stores an empty value.
- **`YOUTUBE_API_KEY` is optional, and the Live room degrades without
  it.** With no key, `/live` embeds "whatever is live on this channel",
  which is all YouTube offers for free. With one, the room lists each
  concurrent broadcast by name and lets you search them. Getting it:
  Google Cloud console → new project → enable **YouTube Data API v3** →
  Credentials → Create API key. No OAuth consent screen and no redirect
  URIs — this is a plain key, unlike Google sign-in. Paste it into Vercel
  as `YOUTUBE_API_KEY` and redeploy. Restrict it to the YouTube Data API
  from the console once it works.
  Quota: the free allowance is 10,000 units a day. The room deliberately
  avoids `search.list` (100 units a call) and reads the channel's uploads
  playlist instead (1 unit) plus one `videos.list` (1 unit) to ask which
  are live — 2 units a poll, cached for 120s. Three feeds polled
  constantly for a day is roughly 4,300 units, well inside the ceiling.
  If the key is wrong, revoked, or out of quota the room silently falls
  back to the channel embed rather than erroring.
- **Hourly grading runs from GitHub Actions**
  (`.github/workflows/grade.yml`), because Hobby refuses sub-daily crons.
  Needs `CRON_SECRET` in the repo's Actions secrets, matching Vercel's.
  The Vercel daily cron stays as a backstop; running both is safe because
  `/api/grade` only ever moves a pick out of 'pending'. The workflow
  fails loudly on any non-200 — a 401 means the two secrets disagree, and
  a silent pass there would look identical to working.
- **Rewriting a shared check constraint restates every value.** The
  `notifications_type_check` list has been widened twice — 008 defined
  four types, 011 added the two DM ones, 026 added repost. Rebuilding it
  from any single migration's definition silently drops the others, and
  Postgres only catches it if rows already use them. Before touching that
  constraint, grep every migration for what inserts into the column.
- **Reposts (migration 026).** A repost is a take with `repost_of` set,
  so it carries no money of its own and the existing take constraints
  already forbid odds and stake. `repost_of` always points at an
  original — reposting a repost resolves to the pick — so chains stay
  one level deep and a card always shows the real thing.
- **`lib/postMeta.ts` is where anything extra on a card comes from** —
  grade notes, odds provenance, the quoted post, repost counts. All of
  it in separate queries, because folding a new column into the main post
  selects breaks the feed and every profile until the migration runs.
- **Sportsbook APIs are not usable.** DraftKings answers 403 (Akamai) and
  FanDuel 400 to a server request; both were tested. It doesn't matter,
  because ESPN's odds *are* DraftKings — same numbers, through an
  endpoint meant to be read. Player props, alternate lines and live
  in-game odds are the gap, and they need a paid feed.
- **Part-of-game bets are asked the way people say them (migration 030).**
  NRFI is yes/no, not over/under 0.5. First five and first half each come
  in two forms — a total, and who leads at the break — and the second is
  priced three ways because a tie there is a real result, not a push.
- **"First half" is league-dependent.** Football and the NBA are
  quartered so a half is two periods; college basketball is already
  halved so it's one. Hockey has three periods and no half, and ESPN
  publishes no line scores for soccer at all — so neither offers these
  bets, and `periodsFor()` returns null for them rather than guessing.
  The form hides bet types a league can't settle, and resets the choice
  if you switch leagues.
- **Bets on part of a game (migration 028).** First inning (NRFI/YRFI),
  first five innings, first half. The scoreboard already carries innings
  and quarters per side, so these settle from the same feed as
  everything else. They refuse when the periods weren't played — a game
  called in the fourth can't settle a first-five bet, and a partial sum
  would be a guess.
- **Home runs and player props can't be graded.** They need a box score,
  not a scoreline. Deliberately not offered as auto-graded types: a bet
  type that can never settle is worse than one that doesn't exist.
- **Money on a pick is opt-in.** The odds and stake chips are collapsed
  behind "Add odds and stake". Left closed they still held their
  defaults — -110 and $50 — and those would have been written to every
  pick as a price and a stake the author never chose. A book price is
  still recorded either way, because that's a fact about the market; a
  stake never is, because it's only ever a claim.
- **Self-reported money is private by default (migration 029).** A
  hand-priced pick keeps its odds and stake, but only the author sees
  them unless they publish, and published ones are labelled
  self-reported. Either way they never reach the leaderboard, which sums
  only prices a book posted. Profiles show two figures for this reason:
  a public Profit, and a private one visible only to the owner.
  Note the hiding is done in the app, not in RLS — the row is still
  publicly readable, so this keeps numbers off other people's screens
  rather than making them secret. Worth moving to an author-only table
  if that ever needs to be a real guarantee.
- **The post form suggests games** (`/api/games`) once a league is
  chosen, filtered by the cashtag being typed. It's the same market
  buttons as a game page, so a pick started from the Post button can
  still carry a book price.
- **Money requires a posted price (migration 028)** — superseded by 029
  above, which brought the numbers back as a private record.
- **Migration 028 cleared money from existing custom picks.** Odds were free text,
  so "$5 to win $1,000,000" was a legal pick. Picks taken from a real
  market keep their money; hand-entered ones keep their result and carry
  no payout. That means tennis, UFC and props are result-only, since
  ESPN publishes no odds for them.
- **Picks can be posted from real markets (migration 025).** ESPN's
  scoreboard carries DraftKings prices per side — moneyline, spread and
  total — for games that haven't started. Tapping one fills the form and
  records `odds_source = 'book'`; typing a price records `'custom'` and
  labels the post. Editing the odds after arriving from a market clears
  the book flag, because the number is no longer theirs.
  Only pre-game: ESPN drops the odds block once a game starts, and a
  stale price shown as live would be worse than none.
  Props, parlays and alternate lines have no source and stay custom.
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
- **A pick can't be deleted once its game starts (migration 027).**
  Auto-grading stopped anyone marking a loss as a win; deleting reached
  the same outcome another way — post twenty, delete the losers, keep a
  5-0 record. That's the first thing anyone clever tries. Before kick-off a pick is still withdrawable, which is
  fair. Graded picks are never deletable. Enforced by RLS, and the menu
  is told so it can explain rather than offering a button that silently
  does nothing: a blocked delete returns success with no rows touched.
- **An admin cannot grade their own pick.** Enforced in
  `/api/admin/grade`, not in the UI, and the button is replaced by an
  explanation rather than hidden. There is one admin and they post picks
  like everyone else, so this is the first thing anyone assumes about the
  board — refusing it in code makes the answer verifiable.
- **Manual grading uses the service role**, never a grant. Granting
  update on posts back to `authenticated` would reopen the self-grading
  hole 022 closed, so the exception lives behind an is_admin check in a
  route instead.
- **The $300 launch contest is gone.** `lib/contest.ts`, `/contest` and
  the `week1_champion` badge were removed; the site now sells the thing
  it always actually had, which is a record nobody grades themselves.
  Migrations 024, 027, 031, 037 and 038 still argue from "a cash prize"
  in their comments — they are history and were left alone, but the
  rules they enforce stand on the leaderboard being trustworthy, not on
  a prize, so none of them should be relaxed on the grounds that the
  contest ended.
- **The 5-pick minimum is enforced by the leaderboard view**, not by
  code (`having count(*) filter (...) >= 5`, re-declared by every
  migration that redefines the view). `MIN_GRADED_PICKS` in
  `lib/rules.ts` only keeps the page's copy from drifting from it —
  moving the real threshold takes a migration.
- **Share previews are generated, not stored.** `app/opengraph-image.tsx`
  renders a 1200×630 PNG at build from the same constants the site uses,
  so the card can't claim something the pages don't. `metadataBase` in
  `app/layout.tsx` is what makes the tag absolute — without it messaging
  apps drop the image silently and the link still previews, just with no
  picture, which is easy to miss.
- **Feed preferences (migration 023).** Up to 3 leagues per profile,
  chosen at signup and editable from Edit profile. Null/empty means the
  default mix, so nothing changed for existing accounts and logged-out
  visitors are unaffected. The rail and the news carousel put chosen
  leagues first and then *always* backfill with the default mix — a
  literal filter would give someone who picks NFL, College Football and
  NBA an empty rail every June, which is the dead feed the scoreboard
  exists to prevent. `npm test` covers that case.
- **`lib/sportWords.ts` names a contest per league.** Tennis has
  matches and players, UFC and boxing have fights and fighters, golf has
  tournaments. "Those are the same team" is wrong about most of the
  sports on the site.
- **Trending needs three different people.** Three posts used to be
  enough, so anyone could invent a cashtag and push it onto the front
  page alone. Made-up tags are allowed on purpose — a pick between
  friends, a movement like $BIGBETTORS — and the only thing separating a
  movement from one person shouting is how many voices are in it.
- **Cashtag suggestions come from the fixtures, not a list.**
  `/api/cashtags` reads whoever is playing in the next ten days and
  returns the same codes grading matches against. A hand-kept list can't
  hold a tennis draw or a fight card, and typing a name that isn't in
  one produced "$TAYLOR TOWNSEND vs $TOWNSEND" — the ticker is the first
  word of the tag, so a two-word name becomes a code matching nobody.
  The form now refuses a tag with a space unless what follows is a
  spread number.
- **Athlete codes are disambiguated per match (migration 032).**
  Surnames collide, and a Fernandez v Fernandez match produced two
  identical codes — not just ugly: grading finds the side by matching a
  pick's code against the two team codes, so identical codes make it
  undecidable which player was backed. `distinctCodes` widens by one
  letter of the first name at a time, and falls back to a numeric suffix
  for genuinely identical names. A post can no longer name the same side
  twice, enforced in the form and by a check constraint.
  Trade-off: a player's code differs between a match where their surname
  collides and one where it doesn't, so their cashtag page splits. Worth
  it — a wrong grade is worse than a split tag.
- **RLS scopes rows, never columns — on INSERT too (migration 033).**
  022 revoked UPDATE so nobody could grade their own picks; 031 kept
  badges out of the profile grant. Both only restricted UPDATE, and
  INSERT was never touched — so a signed-in account could insert a post
  that was *already* a win, with a profit and graded_by 'auto', and the
  leaderboard counts exactly that shape. Both tables now have
  column-scoped INSERT grants. Any new column defaults to unwritable,
  which is the right way round: add it to the grant deliberately.
- **Google sign-in leaves a window with no profile row.** Between the
  OAuth callback and claiming a username there's a session and no
  profile, and a profile could be inserted with is_admin true. Closed by
  the same grant.
- **Login by username is throttled per username** (10 per 15 minutes,
  `login_attempts`). Email login goes browser-to-Supabase and is
  rate-limited there; username login is resolved server-side, so every
  attempt reaches Supabase from one address and its per-client limit
  would throttle all users together instead of the attacker.
- **Badges (migration 031).** `profiles.badges` is a text[] of earned
  marks: `founding` for the first 200 accounts, awarded by a trigger so
  the cap holds however an account is made. The migration also defines
  `week1_champion` and its check constraint still permits it, but the
  contest it marked is gone and `lib/badges.ts` no longer renders it —
  an unknown id is dropped rather than shown. Badges are deliberately
  absent from the `authenticated` update grant: one you can give
  yourself is a decoration, not a record.
- **Adding a profile column? Read it in its own query.** This has now
  caught me twice — `preferred_leagues` and then `badges`. The main
  profile select gates `notFound()`, so a column that doesn't exist yet
  takes every profile on the site to 404 until the migration runs. Folding one into
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
- **Text colours are measured, not chosen.** Every ink and accent token
  clears 4.5:1 against both the page background and a card, in both
  themes. Three were failing: light `--ink-faint` at 2.84:1 — under the
  bar even for large text, and it's what every small label uses — light
  `--brand` at 3.46:1 on 12px links, and light `--pending` at 4.08:1.
  Dark `--ink-faint` was 3.31:1.
- **The light palette is defined twice** — once for
  `prefers-color-scheme` and once for the explicit `[data-theme="light"]`
  toggle. They must be edited together; a fix applied to one leaves half
  of light-mode users on the old values.
- **Type hierarchy, applied consistently.** Three rules, taken from the
  game-page pass and used site-wide: a label is scaffolding so it goes
  small, uppercase and faint (`.stat-key`, `.stat-label`, `.gd-k`); the
  number is the point so it goes larger and bolder with tabular figures;
  and a status is a badge, never grey text. When a label and its value
  are the same size, a row reads as one undifferentiated string — which
  is what made the game page look flat.
- **Fonts.** Now Inter, one family everywhere, matching Polymarket —
  their markup references Inter and no other face. Headings are 700, not
  800. The `--font-display` and `--font-mono` tokens still exist and
  point at the body face, so a future change is two lines in
  `app/layout.tsx` plus the tokens, not a sweep through components. The
  earlier rejected Manrope/Inter pairing is still on `typography-preview`.
- **Tennis and UFC share one parser** (`parseIndividual`). Both give
  athletes rather than teams, and the only structural difference is that
  a tournament nests its matches under `groupings` while a fight card
  lists them straight on the event. The team parser read one competition
  per event and looked for a `team.abbreviation` that doesn't exist,
  which is why UFC cards rendered with no names at all.
- **A fight arrives as 1-0.** MMA has a winner, not a score, so the
  parser expresses the result that way and a moneyline settles through
  exactly the same arithmetic as every other sport. A draw is 0-0, which
  grades as a push with no special case anywhere.
- **ESPN publishes no odds for UFC**, so those picks are always custom.
  Same as tennis. Only the US team sports carry priced markets.
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

## Session 12 — Making it worth arriving at (4-7 Sep 2026)

Four days of work that never made it into this file until 7 Sep. All of
it live.

- **The house account (037, 038).** One `is_bot` profile posting from
  real book prices so a visitor doesn't land on an empty timeline. 037
  kept it off the leaderboard entirely; 038 put it back on, labelled,
  because a model whose record is hidden is a model nobody can check. It
  posted two picks an hour until 7 Sep, which made the feed 85% one
  account — now one every three hours, enforced in `/api/house` from the
  account's own last post rather than in the schedule that calls it.
- **Email notifications (039).** `lib/email.ts` is the shell, Resend is
  the sender, `/api/notify` builds one digest per person per run. Rows
  are claimed by stamping `emailed_at` *before* sending so two runs can't
  double-send, and a failed send hands the claim back. The welcome email
  is stamped only after it lands — the first version marked everyone
  welcomed while the sends were failing, and that greeting only happens
  once.
- **Three hourly jobs, all on GitHub Actions**, because Hobby refuses
  sub-daily crons: grading at :17, house picks at :37 (now every third
  hour), notification emails at :47. Each fails loudly on a non-200; a
  401 means `CRON_SECRET` in Actions and in Vercel disagree.
- **Receipts.** `/receipts` renders the day's settled picks as one image
  worth posting, and each post has its own OG card.
- **Private money, period bets, reposts** (026, 028-030) — the pick can
  be public while the stake isn't, bets on part of a game are asked the
  way people say them, and a repost is its own post starting at zero.
- **The launch contest, added 4 Sep and removed 7 Sep.** $300 for the
  best Week 1 records. It came off because it was the loudest thing on
  the welcome card, the share image and the first email, and it was a
  promise the site didn't need to make — what it actually offers is a
  record nobody grades themselves. `lib/contest.ts`, `/contest` and the
  `week1_champion` badge are gone; `MIN_GRADED_PICKS` moved to
  `lib/rules.ts` because the 5-pick threshold was never a contest term.
  Migrations 024, 027, 031, 037 and 038 still argue from "a cash prize"
  in their comments — they're history and were left alone, but the rules
  they enforce stand on the leaderboard being trustworthy, so none of
  them should be relaxed on the grounds that the contest ended.
- **One green, at last.** The light-theme commit tokenised every
  dark-only colour but left the dark half as `--btn-ink: var(--btn-ink)`
  — five properties pointing at themselves, invalid at computed-value
  time. Dark mode ran for five days with no `--btn-ink`, `--chrome`,
  `--shadow`, `--tint-brand` or `--tint-bear`: no fill behind your own DM
  bubble, no chrome behind the tab bar, no text colour on a green button.
  Fixed, and every green is now `--brand` or derived from it, with
  `lib/brand.ts` holding the same values for email and the OG images,
  which can't read CSS. `lib/brand.test.ts` fails if the copies drift.
- **A game card can no longer draw on its neighbour.** "College Football"
  set in 11px/800 is wider than the 152px card, and `white-space: nowrap`
  with nothing containing it put the chip on top of the next game in the
  rail. Long league names abbreviate now (CFB, CBB) and the card clips
  its own content.

---

## Session 11 — Polish round two, then a wider invite

- [ ] **Invite people.** This is the whole remaining step. Five accounts
      and 19 human posts after five sessions of building; the next
      feature will not change that number and the last several didn't.
- [ ] Fix whatever the first testers tripped over
- [ ] Re-enable "Confirm email" in Supabase with a real email provider —
      currently OFF, which is fine for five friends and not fine for
      strangers
- [x] **Next.js upgraded to 16.3.4 / React 19** (Session 8g). Done early
      rather than last, because the async `cookies()` change touches every
      server component and gets more expensive with each feature added on
      14.x. `npm audit` reports 0 vulnerabilities.

---

## Profile editing was broken for three days (migration 041)

Reported 8 Sep: "I cannot edit my bio", with **permission denied for
table profiles** under the form.

Not the bio, and not migration 040 despite the timing. **Every profile
save had been failing since 039 ran on 5 Sep** — bio, display name,
username, avatar and league choices alike, for every account.

039 added `email_notifications` and the edit form started sending it. The
column-level UPDATE grant was never widened to include it. A Postgres
UPDATE that names a single column the role can't write fails whole, and
the form sends every field on every save — so one missing column took the
entire form down.

Three days of nobody noticing, because the failure is a red line under a
form rather than anything the server logs, and there are six accounts.
This is the same shape as the two `relation "x" does not exist` incidents
in Known gaps: **a feature that quietly does nothing, with the cause one
migration back.**

`041_grant_email_notifications.sql` restates the whole grant —
`username, display_name, bio, avatar_url, preferred_leagues,
email_notifications` — and never `is_admin`, `is_banned`, `badges` or
`welcomed_at`, which is the entire reason the grant is column-level. RLS
already limits updates to `auth.uid() = id`, so widening a column can
only ever affect the account's own row.

**Run 9 Sep and confirmed working** — a bio saves. Three days of broken
profile editing, closed.

**`lib/grants.test.ts` now fails the build if the edit form writes a
column the migrations don't grant** — it parses the grant out of the SQL
and the payload out of the component and compares them. Verified by
removing 041 and watching it fail. It cannot tell whether a migration has
actually been *run* against the database; that's still on you.

### The rule this earns

**Adding a column the user can edit is two changes, not one:** the
`alter table`, and the `grant update`. 039 did the first and not the
second. The same trap as the `notifications_type_check` list — restate
the whole thing, never append from memory.

---

## Security review — 8 Sep 2026

A full pass over every route, grant, policy and input, plus live probes
of the production database with the public anon key. `npm audit` is clean
and RLS holds: as `anon`, every private table (`messages`,
`conversations`, `reports`, `notifications`, `vent_messages`,
`game_messages`) returns zero rows, every write is refused, and
`login_attempts` refuses even to be read. Column grants are correct —
`authenticated` still has no UPDATE on `posts` at all.

Four things were wrong. Three are fixed in code; one needs a migration.

### 1. Login throttling could be bypassed with LIKE wildcards — FIXED

`/api/login` throttles ten attempts per username per fifteen minutes,
keyed on the string it was given, and passed that string straight into a
Postgres `ilike`. `%` and `_` are wildcards there, so `jbreezy823`,
`jbreezy82%`, `jbreez%` and `%reezy823` are four different throttle keys
that all resolve to the same one account — four separate allowances, and
no limit on how many more patterns you can invent. Verified against the
live database before fixing: all four returned that single account.

Not a login bypass; the password still had to be right. But it removed
the thing that makes guessing expensive, against a site where the minimum
password is 8 characters and leaked-password protection is Pro-only.

Two checks now, because one wasn't enough. The username must match
`^[a-zA-Z0-9_]{3,20}$` before it reaches the database — but `_` is legal
in a name *and* a single-character wildcard, so shape alone still let
`jbreezy82_` through. The route now also requires that the row it found
is the row that was asked for, which leaves the exact username as the
only string that can authenticate and therefore the only key worth
throttling. `lib/username.test.ts` covers both.

That regex had been defined three times, in three client components, and
nowhere on the server — which is how a rule becomes advice. One copy now,
in `lib/username.ts`.

### 2. `is_admin` was readable by the public — FIXED (migration 040, run 8 Sep)

Anyone could ask the REST API which account is the admin, without signing
in, using the anon key that ships in the page. That's the first half of an
attack — pick the target, then guess — and the second half was #1.

`supabase/migrations/040_hide_admin_flag.sql` **has been run and
verified** — the privileges query returns zero rows for `anon`. It
revokes `select (is_admin, email_notifications, welcomed_at)` on
`profiles` from `anon` only; `authenticated` keeps them, because every
check in the app is a signed-in user reading its own row. Two count
queries that asked for `select('*')` on `profiles` were narrowed to
`select('id')` first — under the revoke, a `select=*` from anon starts
erroring with "permission denied for column is_admin", and the
logged-out feed's founding counter is the thing that would have hit it.

### 3. Two public endpoints amplified cheap requests — FIXED

- **The tennis scoreboards are never cached.** `next: { revalidate }`
  refuses anything over 2MB and those responses are 2.3MB and 2.6MB, so
  every request touching tennis went to ESPN and pulled about four
  megabytes. `/api/games` and `/api/cashtags` are both public and take
  the league from the query string. `lib/scores.ts` now memoises the
  *parsed* fixtures — a few kilobytes, so the ceiling never applies —
  for sixty seconds per instance.
- **`/api/receipts` rendered a 1080×1080 PNG on every hit**, public,
  unauthenticated, `force-dynamic`. Nothing in it is per-visitor, so it
  now carries `s-maxage=300` and the CDN absorbs the repeats.

### 4. Avatar uploads were unbounded — FIXED

Any signed-in account could fill the storage bucket two megabytes at a
time: the path was timestamped, so every upload kept the last and nothing
reclaimed it. One file per account now (`<id>/avatar.jpg`, overwritten),
with a `?v=` on the returned URL so the new picture actually shows.

### Also added

No security headers existed. `next.config.js` now sets
`frame-ancestors 'none'` and `X-Frame-Options: DENY` (every destructive
control on this site is one click behind a session that stays signed in,
which is exactly what clickjacking wants), plus `nosniff`,
`Referrer-Policy` and a `Permissions-Policy`. **A real CSP restricting
script sources is still missing** and is the biggest remaining hardening
job — it needs testing against Clarity, the Reddit pixel, Vercel
Analytics, Supabase realtime and Google Fonts, and getting it wrong
half-breaks the site in ways that look like a different bug.

### Residual risks, accepted for now

- **No rate limiting on content.** Posts, comments, DMs, vent and chat
  messages have none. One account can flood any of them. Fine at six
  users; do this before a public launch, and note the moderation queue is
  one person.
- **Avatar content is only checked by its declared type.** `file.type`
  comes from the browser. Storage forces `image/jpeg` on the way out, so
  it can't become a stored-XSS vector, but arbitrary bytes can still be
  parked in the bucket by a signed-in account.
- **Email confirmation is still off**, so an address is never proven.
  Already noted under Known gaps; it matters more once ads run.

---

## Making an empty site useful (9 Sep 2026)

The question that matters once ads run: a bettor arrives, sees live
scores they can get anywhere, news they can get anywhere, and a social
feed with six accounts on it. Why would they stay?

**The diagnosis.** Scores and news are commodities and can't be won.
The feed is currently worse than neutral — 106 of 125 posts are the house
model, which a stranger reads as fake or dead, not as quiet. The grading
engine is the only thing here that isn't a commodity, and the important
property of it is that **it needs no other users to be valuable.**

**The reframe.** Stop selling "join our community", which can't be paid
back at this size. Sell "prove you were right" — a tool that works with a
userbase of one and produces artifacts that travel *out* to the group
chats members are already in.

**Built first: the personal receipts card** (`/receipts/<username>`,
`/api/receipts?user=`). The site-wide card is marketing; a card of *your*
week is what somebody actually posts, and it's the only distribution the
site has while it's small. It shows wins and losses, never money. A
"Share record" button sits next to Edit profile.

**Built second: the welcome modal waits for interest.** It used to open
on arrival and lock its own close button for three seconds. Survivable
for someone who typed the address in; the wrong way to meet someone who
clicked an ad, who has no idea yet what they'd be signing up for and
whose first experience is the site refusing to move. It now waits for
600px of scrolling or fifteen seconds, and the close button doesn't lock.
The listener is on `main.scroll`, not the window — the document never
scrolls here, so a window handler would never fire.

**Built third: the house model no longer owns the feed.** On 9 Sep the
twelve most recent posts were all it — a stranger arriving from an ad saw
one automated account talking to itself. `lib/feed.ts` now leads with
people and lets the model fill behind them at two-to-one. The first
twelve cards went from 12 model / 0 people to 4 model / 8 people.

Two things this turned up. The feed is now **ranked, not chronological** —
a person's post from yesterday can sit above the model's from an hour
ago. Every card still shows its own timestamp, so nothing is hidden, but
it's a real change rather than a tidy-up. And the query had to widen from
50 posts to 150 before trimming: only *two* of the 50 most recent posts
were human, so there was nothing to interleave with. Both are stopgaps
with the same expiry — once people post enough to fill the feed on their
own, `arrangeFeed` does nothing and can be deleted.

**Built fourth: a personal record page, a following feed, and squads.**

- **`/profile/<name>/record`** splits a record by league and by bet type,
  shows the last ten as form, and names the current and longest run.
  `lib/record.ts` is pure so all of it is tested. Pushes decide nothing —
  outside the win rate, outside form, and they don't break a streak. An
  empty record reports no win rate rather than 0%, because 0% is a claim.
- **Everyone / Following** on the feed, offered only once somebody
  actually follows an account. Following skips the rebalancing — it's
  whoever you picked, in the order they posted.
- **Squads (migration 042).** A named group with a members-only live
  room. The site had the whole-site timeline and a two-person DM and
  nothing in between, which is where sports talk actually happens.
  Public to signed-in users so a room can be found; the room itself is
  members-only and RLS enforces it, so a broken UI can show an empty room
  but can't leak one. The owner is enrolled by a trigger rather than by
  the route, so it holds however a squad is made. `is_private` exists and
  is deliberately unread — invite-only brings real moderation questions
  and half of it would be worse than none.

`lib/squad.test.ts` reads the check constraint out of 042 and asserts it
matches the regex in the app. That pairing has bitten before in a
different form: a shape enforced in two places drifts, and the failure
surfaces as a database error nobody can act on.

**Built fifth: head-to-head challenges (migration 043).** The only
feature here aimed at somebody who isn't on the site yet. One person
takes a side and gets a link; whoever opens it takes the other. `/c/<code>`
is readable **without an account** on purpose — gating it would mean
signing up to find out what you were signing up for.

The design decision that made it small: **a challenge has no grading of
its own.** Each side posts as an ordinary pick, the existing hourly job
settles both, and the result is derived from those two posts rather than
stored. So it counts toward both records, can't be graded by either
party, and there's no second code path to disagree with the first.

`lib/challenge.ts` is pure and tested. The case worth knowing about is
the spread: the opponent's number has to flip sign as well as team, or
you've handed two people the same bet and called it a head-to-head.

**Built sixth: squad invites (migration 044).** By username for somebody
already here, by link for somebody who isn't — WhatsApp, X, Facebook,
SMS, copy, and the OS share sheet.

**An invite is an offer, not an enrolment.** The invitee gets a
notification and joins themselves; 042's membership policy still only
allows a row to be inserted for yourself, and this doesn't weaken it.
Being dropped into a group chat you never agreed to is how group chats
become things people mute.

Notifications have no INSERT policy on purpose (008) — they're written by
triggers so nobody can spam anybody directly. So an invite is a row in
its own table with its own rules, and a trigger turns it into the
notification. One invite per person per squad, twenty a day per account.

044 also makes a squad **previewable without an account**, which 042 got
wrong: a link forwarded to WhatsApp hit a login wall before saying what
it was. The name, blurb and join button are public now; the room and the
member list are not. Same call as the challenge page.

`lib/digest.test.ts` now reads the type constraint out of the migration
and asserts every type in it has a sentence in the email. Without that, a
type added later quietly produces "Someone did something."

**Built seventh: highlight clips, and outlined icons.**

- **Clips (`lib/clips.ts`, `/clips`).** The leagues' own highlights,
  embedded from their own YouTube channels. **The footage is never
  hosted here** — that's someone else's copyright, and a takedown against
  a site selling verifiability would be a remarkable way to go. The embed
  player is what's licensed for this: the league gets the view and the ad
  money.
  - Read over **RSS**, not the Data API. `youtube.com/feeds/videos.xml?channel_id=`
    needs no key and costs no quota, so clips work whether or not
    `YOUTUBE_API_KEY` is set and can't starve the Live room of its 10,000
    units a day. Worth remembering before reaching for the API again.
  - Note the distinction from `lib/watch.ts`, which says the NFL, NBA,
    MLB and NHL can't be added. That's true of **live streams**, which
    they sell. Highlights they publish themselves.
  - Titles are filtered for "highlight" because a league channel posts
    shows, interviews and its own adverts in the same feed — "NFL+ - Bed"
    is a real title from the real feed. There's no field saying what kind
    of video it is, so the only signal is what the league called it.
  - **Capped per league**, and the leagues are the ones chosen at signup.
    Pure recency didn't work: MLB plays daily and posts several reels a
    night, so in September it filled the rail alone and an NFL follower
    saw nothing they'd asked for. When the chosen leagues are quiet the
    default mix backfills — somebody who picked the NFL in February
    hasn't stopped caring about it, and an empty rail teaches them the
    feature is broken.
  - **RSS returns only the latest 15 uploads**, which is plenty for a
    quiet channel and useless for the NFL's: two days after Week 1, not
    one of its latest 15 was a highlight reel. So when `YOUTUBE_API_KEY`
    is set, the playlist endpoint is used instead — `maxResults=50` for
    the same single quota unit — and RSS is the fallback. Four channels
    every ten minutes is roughly 600 units a day against 10,000, so it
    doesn't crowd the Live room. **Setting that key in Vercel visibly
    improves this feature**; without it, NFL clips are hit and miss.
  - NBA and NHL showing nothing in September is correct — they're out of
    season, and there are no highlights to show.
  - **Comments on clips (migration 045)**, keyed by video id with no
    clips table — exactly as `game_messages` is keyed by
    `LEAGUE:espn_event_id` with no games table. Nothing to seed, nothing
    to sync, and no row to go stale when a league deletes a video.
    Publicly readable, unlike the Vent room and game chat: this is a
    comment under a public video on a public page, and a visitor from an
    ad should be able to see somebody is here.
  - Sharing lives in `components/ShareRow.tsx`, used by both the clip
    page and the squad invite. It was hardcoded twice before that.

- **The chrome is outlined icons** (`components/Icon.tsx`) rather than
  emoji, which rendered differently on every OS. Messages is a paper
  plane — an envelope reads as email.

**Built eighth: clips play in place, squads have a picture (046), and
the `$` autocomplete knows what's on.**

- **No autoplay, deliberately.** Facebook and X autoplay their own MP4s —
  a few hundred KB they host. These are YouTube iframes, about a megabyte
  of player each before a single frame. Four starting on their own would
  cost a phone its battery and its data to show four thumbnails. The
  player is built on the first tap instead: nothing but an image loads
  until somebody asks, and then it starts with sound, because the tap is
  the permission browsers otherwise make you earn by muting.
- **Squad pictures (046).** The column, plus a **column-scoped** UPDATE
  grant: 042's policy was row-level and never named columns, so an owner
  could have rewritten their squad's slug — the thing every link already
  sent points at. Files go through the existing `/api/avatar`, which now
  checks the caller owns the squad.
- **`$` suggests teams that are actually playing**, live first, then
  soonest kick-off, then the curated list. A cashtag typed into a room is
  nearly always about a fixture, and a static list can't tell July from
  ten minutes before first pitch. A bare `$` still offers nothing — with
  every tennis draw in the window, the six soonest fixtures are not a
  useful answer to a question nobody has finished asking.

**Built ninth: the squad table.** The reason a squad is worth having
rather than a Discord server: a Discord server has no idea who in it was
actually right, and this does.

Every member appears, including the ones who've posted nothing — a
standings table that hides the people at the bottom isn't standings.
Ranked on win rate among those who've settled anything, ties broken by
the longer record and then by profit, and anybody with no settled pick
sorts last, because an empty record isn't a good one.

The site leaderboard's five-pick minimum is right for a public board and
wrong for a group of six, where it would show nobody. So a thin record is
**ranked and flagged** rather than hidden: 1-0 shows as 1-0, marked
"thin", and doesn't get to look like a season.

**On competing with Discord.** The wedge isn't chat and shouldn't be
sold as one — group chat is winner-take-all, and the switching cost isn't
the software, it's that everybody's group is already somewhere else. The
pitch is *settle your group's arguments*, which is a thing Discord
structurally cannot do. Note also that an **empty squad is worse than an
empty feed** — a chat room with nobody in it is visibly dead where a
quiet timeline just looks new — so ads should keep pointing at what works
for one person, and squads should grow through the invite links.

**Built tenth: the house model drops to one pick a day, and come-back
emails (migration 047).**

- **One house pick a day**, down from one every three hours (and two an
  hour before that). Eight a day against nineteen human posts in three
  weeks meant `lib/feed.ts` had to actively hold the account back. Put it
  up again when real people outnumber it — **the ratio is what the number
  is for**, not the number.
- **Come-back emails on day 3, day 10, day 30, then nothing.** Not daily:
  somebody who hasn't been back in three days didn't stop for want of
  reminding, and a mail a day is how a young sending domain earns a spam
  reputation it can't undo. An account that ignored all three has
  answered. Content-led — their own settled picks first, then headlines
  and highlights, then a squad prompt. Never "we miss you".
- **`last_seen_at`, not `last_sign_in_at`.** A session lasts weeks, so
  somebody who opens the site every morning can have signed in once, a
  month ago — emailing on that would nudge the *most* active people to
  come back. Stamped by the layout when it's more than six hours stale.

**047 also closed a real hole.** There has never been a database
constraint on username format — the shape lived in `lib/username.ts`, the
signup form and `/api/login`, and nowhere the data sits, while 033 grants
`insert (username)` to any authenticated caller. The app is safe because
React escapes what it renders; **the emails are not, because they build
HTML by joining strings**. Both halves are fixed: a check constraint
matching `USERNAME_RE`, and escaping in `lib/digest.ts` and
`lib/nudge.ts`. The tests for both now assert it.

**Built eleventh: pictures and GIFs in squad rooms (048).**

GIFs come from **GIPHY**, proxied through `/api/gifs` so the key stays on
the server, with `rating=pg` applied there where a caller can't change
it. Inert without `GIPHY_API_KEY` — the picker says it isn't switched on
rather than sitting empty, because an empty grid reads as broken rather
than unconfigured. Key from **developers.giphy.com**, free tier, and
their terms require the "Powered by GIPHY" mark stays visible.

**The reactions tab is the default and needs no key at all.** Google's
Noto animated emoji, openly licensed, served from Google's CDN — nothing
to sign up for, nothing to store, no key to leak and no copyright
question. `lib/stickers.ts`, and because `image_url` is just a URL it
needed no migration.

That exists because **both GIF services turned out to be a door that
might not open**. Tenor stopped accepting new API clients in January
2026 and carries a discontinuation notice; GIPHY's signup 404s. The first
integration was written before anybody checked whether a key could be had
at all.

**Two lessons, and the second is the one worth keeping.** Check an API is
open before building on it. And where a feature can be built without
needing somebody's permission, build that version first and treat the
key as the upgrade — a feature that only works once a key is granted is
a feature that might never work.

Migration 048's column comment still says "Tenor" and means GIPHY or a
Noto url; correct it in the next migration that runs for another reason
rather than asking for a run just for a comment.

Uploads go through `/api/squad-image`, which checks membership before
writing — a private room whose pictures aren't private is worse than a
room with no pictures. Resized in the browser with `fitResize`, which
keeps the shape (`squareResize` centre-crops, right for an avatar and
wrong for a screenshot somebody meant you to read) and re-encodes, which
strips the EXIF a phone photo carries — including where it was taken.

**Still to do, in order:**
1. A real personal record page — by league, by bet type, streaks. A
   tracker is useful at one user, and bettors genuinely don't know their
   own numbers.
3. Scope rooms to games, not the site. Six people across a whole site
   feels abandoned; six in one live thread feels like a room. Game chat
   already exists — surface it during live games.
4. Shorten the first loop. Sign up → empty feed → post → wait hours is
   too slow and too social to be a first experience.

**Not to do:** more scores, more news, odds comparison — all commodity,
all lose to their own book. And no more bot accounts; one labelled model
is honest, several is the thing the whole pitch is against.

**The metric.** Not signups. The share of new accounts that post at least
one pick and come back when it grades. High means a distribution problem;
low means more traffic burns the ad budget faster.

---

## A button that does nothing (9 Sep 2026)

"When I press Create the challenge, nothing happens." It was disabled,
and **there was no `.btn:disabled` rule in the stylesheet at all** — so
every disabled button on the site looked exactly like a working one.
Pressing it did nothing and said nothing, which reads as the site being
broken rather than as the form being unfinished.

Two lessons, both wider than the one form:

- **A disabled control has to look disabled**, and ideally say why. The
  challenge form now names the missing step under the button — no
  league, no game, or no side chosen.
- **The form was wrong to be disabled at all.** It required a posted
  book price to build a side, and plenty of fixtures carry none; the
  picker offered them anyway. A head-to-head on who wins needs two teams
  and nothing else, so a game with no market now offers the two teams
  directly. It also refuses a game that has already started, rather than
  creating a challenge nobody can win.

Also fixed alongside: the post form said a game "started 202 minutes
ago". `humanDuration()` in `lib/time.ts` says "3 hours 22 minutes" —
minutes below an hour, minutes alongside hours up to six, then hours,
days, weeks. `timeAgo` is unchanged; it's the compact form for the corner
of a card, and this is the one that goes in a sentence.

---

## Advertising

Nothing has run yet. This section exists so that when something does, the
next session can tell an untried channel from one that was tried and
didn't work — the distinction the rest of this file has never been able
to make.

**Log every attempt here: what ran, where, what it cost, what came back.**
A creative that was made is not a creative that ran.

### Showing the leaderboard instead of describing it (10 Sep 2026)

`/squads` now leads with the thing rather than a sentence about it: a
three-row leaderboard, built from the same `rec-table` and
`squad-board-row` classes the real one uses, so it's the component with
sample rows in it rather than a picture that will drift out of date.

**It's labelled EXAMPLE and the top row is `@you`.** This site's only
claim is that its numbers are real. A convincing fake leaderboard that
could be mistaken for a live one would cost more than it buys.

**No profit column, and that's the whole point of the entry.** The real
leaderboard has one and keeps it. On this page it would read
`@you +$248` to somebody who arrived from an ad, which is an implied
earnings claim — the one thing the ad doctrine rules out flat: *no
guarantees, no win rates, no implied edge, no money anyone could make*.
The record is the product; the dollar figure is the part that sounds like
a promise. The preview shows record and win rate and stops there.

Also on the page: step three now says **Post picks**, because a visitor
could otherwise reach the button without learning what you actually do
here; the step numbers are filled brand chips rather than tinted
circles, since the steps are what a skimmer reads; and one line says a
group can come over from Discord or a group chat.

**That line says "bring", never "import".** There is no Discord
integration and no Polymarket one. An ad promising an import that doesn't
exist is the $300-contest mistake wearing a different hat — and the true
version carries the same benefit anyway, because what the reader wants to
know is that moving their group is easy, not that an API exists.

**Naming Polymarket was considered and dropped.** Printing another
company's brand on our page implies a relationship, which is the exact
reasoning that took DraftKings off the front page on the same day. Discord
and iMessage survive as generic descriptions of where a group already
talks; a prediction market named on a page under a gambling flag is a
different kind of risk again.

### "Table" is a word this audience doesn't use (10 Sep 2026)

The squad leaderboard was called **the table** everywhere — in the copy,
the heading and the comments. It's the right word for a football league
and the wrong one here: the campaign runs at r/nfl, r/CFB, r/nba,
r/mlb and the fantasy subs, where **leaderboard** is the word people
already own. A landing page has about two seconds, and a word the reader
has to translate spends most of them.

So the lead now says *"Track your group's picks on a leaderboard that
keeps itself"*, step three says *"Every pick graded on your
leaderboard"*, and the heading on `/squads/[slug]` was renamed to match.
Renaming only the landing page would have moved the translation one
screen later instead of removing it.

Nothing behind it changed — it's still `standings()` over the members'
settled picks, and the room's record pills come from the same call.

### A green button with nothing written on it (10 Sep 2026)

`.legal a { color: var(--brand) }` beat `.btn` on specificity and painted
every button label inside `.legal` green — on a green background. The
result was a bright empty pill where "Start a squad" should be. It's now
`.legal a:not(.btn)`.

**It was not new.** The same rule had been blanking the "Sign up free"
button on `/squads/[slug]` — the page a stranger lands on when somebody
forwards a squad link to a group chat, which is the single most important
button on the invite path. Nobody had seen it because nobody signed out
to look. Two pages had the bug and only the new one got reported.

The general lesson: **a container that styles bare links will style
buttons that happen to be links.** Anywhere `.btn` sits inside a prose
wrapper, check it logged out and in both themes.

### Too much to read (10 Sep 2026)

The first `/squads` intro answered "what is this" thoroughly and "how do
I start" somewhere below the fold — a lead, a paragraph, three
full-sentence bullets, then the buttons. Everything on it was true and
the shape was still wrong: a stranger off an ad is deciding whether to
care, not studying, and they give it about two seconds.

Inverted now. One line says what it is, the button is directly under it,
and three three-word steps say how it goes. **Nothing was deleted** — the
detail moved into a `<details>` disclosure that the curious open and
everybody else never sees. Native `<details>`, so it needs no JavaScript
and reads correctly to a screen reader.

Worth remembering when the next landing page gets written: the fix for
"too much copy" is almost never shorter sentences. It's deciding what the
page is *for* and demoting everything else behind one click.

### The squad room, rebuilt against Polymarket's (10 Sep 2026)

Polymarket's live match chat was handed over as the bar to clear. Three
things were worth taking, one was worth refusing, and the most obvious
one turned out not to be the answer at all.

**It isn't the typeface.** The reference reads as a different font, and
the instinct is to go shopping for one. We're on Inter for everything —
`--font-display` and `--font-mono` are both aliased to it in
`app/layout.tsx` — and so, near enough, is the reference. The difference
was **size, weight, spacing and hierarchy**. The room was built with a
comment thread's numbers: 26px avatar, 12px between messages, 14.5px text
at 1.4 line-height. That reads as a list of records. A room people are
meant to sit in wants air: 34px avatar, 18px apart, 15px at 1.5, and the
timestamp pushed to the far end so the left edge of every row is name,
record, message — the three things actually being read.

**The idea worth stealing is the pill beside the username.** Polymarket
puts the speaker's position there, which is why their chat reads as
people with something at stake rather than anonymous noise. Gwuap's
equivalent already existed on the same page and one component away: each
member's **record from the squad table**. `standings()` is already
computed for the table, so the room gets it as a keyed object with no
extra query, and the two can never disagree.

That is the answer to the thing a Discord structurally cannot do. The
table answers "who in here is any good" only if you stop reading and go
look; the pill answers it while you read.

**Only a record past the provisional bar gets a colour.** 1-0 is a real
record and a terrible reason to call somebody good. It shows as `1-0
THIN`, uncoloured — the table already draws that line and the room must
not contradict it.

**What was deliberately not copied:** the saturated ring on every avatar,
and the two enormous buy buttons under the thread. Those are a trading
floor, which is exactly the read the front page shed on the morning of
the same day. A squad room is the last place to put it back. The rings
here are muted and only appear once earned, and there are no wager
controls at all.

### /squads had no door for a stranger (10 Sep 2026)

Planning a campaign for the squad rooms turned up the thing that would
have wasted it: **`/squads` redirected logged-out visitors to `/login`.**
An ad for squad rooms would have paid for a click and delivered a bare
login form — the same broken promise as an ad for a prize that no longer
exists, just quieter.

The old reasoning was written down and half right: a list of rooms you
can't enter is a menu you can't order from. That's true of the *list*,
and it says nothing about the *page*. `/squads/[slug]` had already
settled the same question for a single room — its comment reads "sending
them to a login wall first would mean signing up to find out what you
were signing up to" — so the index now does what the room page does: says
what a squad is, then offers the door. The list itself still isn't shown
to strangers, because that part of the old reasoning holds.

Every claim on it is one the room actually keeps: members-only is
enforced by RLS, the grading is the site's own, and the table is
`standings` over the members' settled picks.

**Deploy this before the squad campaign runs.** The ad points at
`gwuap.co/squads`, and until `main` is pushed that URL is still a login
redirect in production.

### The front door on /squads (11 Sep 2026)

Twenty-two people landed and none signed up. The page offered exactly two
doors: **"Start a squad"**, which means naming one and recruiting your
friends, and **"Log in"**, which is for people who already have an
account. A stranger off an ad had one door that asked a lot and one that
wasn't for them.

**We made the mistake we'd explicitly designed the ad to avoid.** The
creative was built so the invite was *not* the ask — "sign up" is one
person's decision, "bring your group chat" is a social risk on behalf of
five other people. Then the landing page made that exact ask one screen
later. Getting the ad right and the page wrong is worse than getting both
wrong, because you pay for the click and lose it at the last step.

The ladder now escalates *after* someone is in, not before:

| | |
|---|---|
| Primary | **Sign up free** → `/signup?next=/squads/new` |
| Secondary | **Look around first** → `/feed` |
| Micro | Free · we never ask for a card · Log in |

`next=/squads/new` keeps the intent through signup, so they still land on
squad creation — having committed something small first.

**"Look around first" is the door that didn't exist at all.** Somebody
weighing whether this is worth an account had no way to see the thing
work without making one. `/feed` is real picks being graded, which is the
whole argument, and it carries the welcome modal for anyone who scrolls.
A visit to `/feed` is a far better outcome than a bounce.

**Judge it on signups, not on clicks.** The pixel already proves the
clicks arrive; the only question this change answers is whether they
convert. The campaign runs to 15 Sep, so there are a few days of traffic
left to measure it against — a small sample, but the first one aimed at
the right problem.

### Clarity moved into the initial HTML (11 Sep 2026)

It was `afterInteractive`, which injects the tag only once React has
hydrated. Fine for someone browsing; **wrong for the traffic we pay
for.** A visitor who lands from an ad and leaves in two seconds can be
gone before hydration finishes, and Clarity never starts — so the one
cohort worth recording is the cohort most likely to be missed. Microsoft's
own instructions say put the snippet in `<head>` for exactly this reason.

It now uses **`beforeInteractive`**, which the bundled Next docs describe
as "injected into the initial HTML from the server, downloaded before any
Next.js module". Measured: the snippet appears in `curl` output on every
page now and appeared on none before.

**That forced two structural changes.** `beforeInteractive` is injected
server-side and must live in the root layout, so `Clarity.tsx` is no
longer a client component — and the route exclusion could no longer use
`usePathname()`. The excluded list is now compiled into the inline script,
which checks `location.pathname` and returns before initialising.
Verified in the browser: on `/reset` the guard is present and the
`clarity.ms` tag is **not** inserted; on `/squads` it is.

**The Vent hole is closed** (`components/ClarityGuard.tsx`). The
load-time check only ever protected somebody who opened `/vent`
directly: open `/feed` first and Clarity is already running, and moving
to `/vent` client-side doesn't unload it. Unmounting a `<Script>` never
did — **the old `usePathname` version had exactly this hole, it just
looked like it didn't.**

The fix had to be an instruction to Clarity rather than an absence of
markup, so `ClarityGuard` calls `clarity('stop')` on entering an excluded
route and `clarity('start')` on leaving — and only restarts if it was
what stopped it, so leaving Vent can't resurrect a session the visitor
disabled some other way. Both components share `CLARITY_EXCLUDED`.

Verified by stubbing `window.clarity` and driving a soft navigation:
`/squads` → `/reset` recorded `["stop"]`, and back again `["stop",
"start"]`.

Note the load-time check in `Clarity.tsx` is still the one that can't
rot: if Clarity ever drops the `stop` command the call becomes a silent
no-op on their queue, and only the hard-load guard would still hold.

**The old project was abandoned.** A genuine 30-second human visit
produced no session, still nothing 20+ minutes later. Thirty seconds
completes hydration many times over, so the old `afterInteractive` timing
cannot explain it — and the domain, IP blocking and consent settings had
all been eliminated by then. That left the project itself.

**New Clarity project: `ygpqdl6jr9`** (the dead one was `yc1lfspsay`).
`NEXT_PUBLIC_CLARITY_ID` in Vercel Production was removed and re-added
with the new value, verified by pulling it back:
`NEXT_PUBLIC_CLARITY_ID="ygpqdl6jr9"`. **It takes effect on the next
deploy** — `NEXT_PUBLIC_` values are baked at build time, so pushing the
commits is what makes it live.

**The new project behaves exactly like the old one.** Live site serves
`clarity.ms/tag/ygpqdl6jr9`, and in the browser: `window.clarity` an
empty object, no `_clck`/`_clsk`. Identical to `yc1lfspsay`.

**Two independent projects failing the same way argues the project was
never the problem** — and points back at the confound already recorded
above: these checks run in an automation-driven Chrome with Clarity's bot
detection on. **Stop using an automated browser to decide whether Clarity
works.** It cannot answer the question.

The 30-second human visit is the one point that doesn't fit, but an ad
blocker or tracking protection blocking `clarity.ms` explains it equally
well — Clarity is a common blocklist entry.

**A clean phone visit produced nothing either, and that ends the
investigation.** What has now been checked and eliminated:

| Checked | Result |
|---|---|
| Tag present, loads | 200 from `clarity.ms/tag/…`, snippet in server HTML |
| Two separate projects | `yc1lfspsay` and `ygpqdl6jr9` — identical behaviour |
| Two environments | automation Chrome **and** a clean phone — both nothing |
| Domain setting | corrected to `gwuap.co` |
| IP blocking | empty |
| Cookie consent gate | none; Cookies: On |
| Load timing | moved to `beforeInteractive`, now in initial HTML |
| CSP / response headers | only `frame-ancestors 'none'`; nothing blocks scripts or connections |

Two projects and two environments failing identically, with nothing on
our side blocking it, means this is not a configuration mistake anybody
is going to find by clicking around. **The remaining move is Clarity
support**, with those facts and both project IDs.

**Stop here.** Clarity was only ever wanted to watch what the 22 paid
visitors did. The Reddit pixel already reports **Page Visit** and
**Sign Up** per ad, which is the funnel data the decision actually needs
— 22 visits, 0 signups was established without Clarity and didn't depend
on it. The hours spent here bought one real improvement (the tag now
loads before hydration, which was a genuine bug for ad traffic) and one
correction worth keeping (never diagnose an analytics tag from an
automated browser).

**Don't spend more time testing this by hand.** The squads campaign is
delivering real Reddit users on real phones until 15 Sep. If Clarity
works, their sessions will appear on their own; if none appear by the end
of the flight with traffic known to be landing (the pixel counts Page
Visits independently), then it's genuinely broken and worth another look.
Either way the front-door fix, not Clarity, is what moves signups.

**Two things changed at once and that was deliberate.** The new project
ID and the `beforeInteractive` move ship together, so if recordings start
we won't know which fixed it. The campaign ends 15 Sep and recordings of
the remaining traffic are worth more than clean attribution of a bug we
may never see again — and the loading change is correct on its own
merits regardless. Recorded here so nobody later reads a working Clarity
as proof the old project was broken.

### Where the clicks go, and Clarity has never worked (11 Sep 2026)

**The Reddit pixel settles the funnel question.** With Conversions
columns turned on for the squads ad:

| | |
|---|---|
| Clicks | 25 |
| **Page Visit (pixel)** | **22** |
| **Sign Up (pixel)** | **0** |
| Reach | 3,308 unique people |

**22 of 25 clicks became real page loads.** Click quality is not the
problem and neither is the ad — people genuinely arrive at `/squads`.
The pixel's zero signups and the database's zero new accounts agree
independently, which is as close to certain as this gets: **the page is
where it fails.**

**Clarity has never recorded a single session.** It has been installed
nine days and its dashboard still says *"ALMOST THERE! Choose an
installation method"*, with Recordings and Heatmaps greyed out. The tag
is not missing — that was checked directly in the browser:

- `https://www.clarity.ms/tag/yc1lfspsay` loads, **HTTP 200**
- the id matches `NEXT_PUBLIC_CLARITY_ID`, set in Vercel Production
- and then nothing happens: **`window.clarity` is an empty object** with
  no methods and no queue, **no `_clck`/`_clsk` cookies are set**, and
  **no upload request is ever made**

So the script is fetched and inert. `curl` can't see any of this because
`next/script` with `afterInteractive` injects the tag client-side — the
page source looks tagless whether it works or not. **Only a real browser
can tell you whether Clarity is running.**

**The domain typo was fixed and was not the cause.** The project's
Website URL did read `gwuap.cp`; it now reads `gwuap.co` and the change
persisted through a reload. Clarity still records nothing: same empty
`window.clarity`, still no `_clck`/`_clsk`, still no upload. Worth
knowing so nobody spends the hour again.

Note what *does* work on the same page load: `_rdt_uuid`, `_twpid` and
`_twsid` are all set. Cookie-setting and third-party scripts are fine in
general; **Clarity specifically declines to start.**

**What an empty `window.clarity` actually tells you.** The inline snippet
defines `window.clarity` as a *function* — a queue stub. Finding an empty
*object* means the real tag downloaded, ran, and deliberately replaced the
stub with a no-op. Clarity decided not to record. That narrows it to
project-side configuration, not the installation.

**Two candidates checked and eliminated:**

- **IP blocking** — the section reads "You aren't blocking any IP
  addresses". Not it.
- **Cookie consent** — Advanced settings show **Cookies: On** and no
  consent gate. Clarity isn't waiting for a `clarity("consent")` call, so
  the two-line code change that was considered is unnecessary. Nothing to
  decide here.

**And a correction to the evidence above.** Advanced settings also show
**Bot detection: On**, and *every* browser test recorded in this section
was run in automation-driven Chrome — which is exactly what bot detection
exists to filter. **The "tag loads and does nothing" finding is therefore
unreliable**: an empty `window.clarity` and absent `_clck` cookies are
what a correctly-working Clarity does when it decides the visitor is a
bot. Don't diagnose Clarity from an automated browser.

What survives that correction is narrower but still real: **the project
has never ingested a session in nine days** and Recordings/Heatmaps are
still greyed out, which bot detection doesn't explain. Though note the
site had almost no human traffic before 10 Sep — the 22 ad visitors are
close to the entire real-visitor history, so "nine days of nothing" is
less damning than it sounds.

**The decisive test is a human one.** Open gwuap.co in an ordinary
browser window, browse for thirty seconds, wait, then check the
dashboard. A session appearing means Clarity was always fine and the
automation was the problem. Nothing appearing after a genuine human visit
means it's broken, and a fresh project with a new
`NEXT_PUBLIC_CLARITY_ID` is the fix — one env var and a redeploy.

**What this costs us right now:** there are no recordings of the 22
people who landed. The obvious next diagnostic — watch what they did —
is unavailable for traffic already paid for. Fixing Clarity only helps
the days remaining before 15 Sep.

**The lesson worth keeping:** an analytics tag that is present in the
code, set in the environment and returning 200 can still be recording
nothing. "Installed" is not "working", and the only proof is a session
appearing in the dashboard. Nobody checked for nine days.

### Takes lost the league picker (11 Sep 2026)

A take is supposed to be the cheap thing to post — that's what the
cashtag is for, and the whole StockTwits borrowing falls apart if there's
a form in front of it. It asked for a league first anyway: three taps of
bureaucracy standing in front of a sentence.

**Posting a take is now: cashtag → backing/neutral/fading → say it.**

| | |
|---|---|
| League select | **gone for takes** (picks still need it) |
| Cashtag suggestions | every league at once, with the league shown beside each |
| Fixture suggestions | live **and just-finished**, across all leagues, last 24h |
| `category_id` | inferred, never asked |

**The league is still recorded — it's just worked out rather than
requested.** `fileUnderLeague` takes it from the suggestion the author
picked, or the fixture they tapped, or `leagueForCode` when the typed
code is unambiguous. Anything left files under "Other", which is what
that category has always been for. So nothing downstream loses the
league, and nobody is asked for it.

**`$LAC` is genuinely ambiguous without a league**, and the fix is to
show rather than resolve: unscoped suggestions print the league beside
each row, so the Clippers and the Chargers are told apart by reading.
Silently picking one would be choosing on the author's behalf, and a
cashtag that means two things is worse than no cashtag.

**Finished games are suggestions now, but only for takes.** The picks
list drops them on the reasoning that "you can't post a pick on a
result" — true of picks and only picks. **A game that ended an hour ago
is the single most likely thing somebody has a take about.** `scope=take`
on `/api/games` keeps `state === 'post'` within 24 hours; yesterday's
result is a take, last week's is a history lesson.

**Leagues are dealt round-robin, which was not cosmetic.** Sorted
straight, a tennis day's twenty-five finished matches sat above every
other sport and the NFL fell off the bottom. Now the top ten spans six
leagues.

### Suggestions lead with your sport (11 Sep 2026)

**There is no screen where anybody picks favourite leagues**, and adding
one would be a settings page nobody fills in to answer a question the
data already answers. `lib/leaguePrefs.ts` infers it instead, best guess
first:

1. **the league last posted in** — the strongest signal by far, because
   people post about one sport for a season at a time
2. the leagues they post in generally, most frequent first
3. the leagues of the cashtags on their watchlist

**It orders, it never filters.** A wrong guess costs one extra scroll; a
wrong guess that filtered would hide the thing they opened the form to
post about, which is far worse than not guessing at all.

Applied to the unscoped cashtag list and the leagueless fixture list —
exactly the two places a take has no league to narrow by. Picks are
untouched: they already have a league.

### "Player" became "Player / Team"

The side label read `words.side` for the chosen league, so on a take it
said "Team" until somebody picked a tennis cashtag and then flipped to
"Player" mid-typing. A take names no league, so the noun can't follow
one — it says **Player / Team** and stays put. Picks still say the right
word for their sport, which is the whole reason `sportWords` exists.

### The take fixture list was hammering ESPN

`lib/scores` relies on Next's fetch cache, and **that cache silently
refuses any response over 2MB** — which the tennis and college-football
scoreboards both exceed (2.3MB, 2.8MB, 2.1MB). Those leagues hit ESPN on
every single call, and `scope=take` asks for all eleven leagues at once,
so opening the post form fanned out a pile of uncached round-trips before
the first suggestion appeared.

The payload is identical for everyone — the personal ordering happens on
the client — so the route now memoises it for 60 seconds. Measured:
**0.89s cold, 0.015s warm.** Per instance rather than shared, which is
the cheap 90% of the fix.

Worth remembering generally: **a `next: { revalidate }` on a large
upstream response is not a cache, it's a no-op with a log line.**

### Deleting a take offered to "Delete pick"

`PostMenu` hard-coded "pick" in three places — the menu item, the
confirmation and the report action — so deleting a take asked about
deleting a pick. It takes the post's kind now. Small, but it's the kind
of wrongness that makes somebody wonder what else on the page is
mislabelled, on a site whose entire pitch is that its words are exact.

### Audit, 11 Sep 2026: 83 paid clicks, 0 new accounts

**The database is the whole story and it is brutal. Six accounts exist.
The newest was created 5 September.** Nothing has signed up since —
including every click both Reddit campaigns have ever bought.

| | |
|---|---|
| Accounts, all time | **6** (newest 5 Sep) |
| Archived campaign | $52.00, 58 clicks → ~1 real signup |
| Squads campaign | $34.22, **25 clicks → 0 signups** |
| Paid to date | **$86.22 for 83 clicks and one account** |

**This outranks every other finding on this page.** The community
breakdown below is real and interesting and almost beside the point: it
does not matter which subreddit is cheapest if none of them convert. The
bottleneck is not the ad, the targeting or the creative. It is what
happens after the click.

**Be honest about the sample.** 0 from 25 is not damning on its own — at
a plausible 2–4% rate you'd expect under one signup from 25 clicks. It's
1 from 83 across both campaigns that's the signal, and 1.2% click-to-
signup on cold traffic is poor but not freakish. The number to fear is
the trend, not the single zero.

**What can't be distinguished yet:** whether those 25 clicks became 25
page loads. Reddit counts a tap; it doesn't know if the page rendered or
the thumb moved on. Vercel Analytics, filtered to `utm_source=reddit`,
separates "nobody arrived" from "everybody arrived and left" — and those
two have completely different fixes. **Check that before changing
anything else.**

**One concrete suspect, and it's ours.** The ad was deliberately built so
the invite was *not* the ask — "sign up" is one person's decision,
"bring your group chat" is a social risk on behalf of five other people.
Then the landing page's primary button says **"Start a squad"**, which
means naming it and recruiting people. The page makes the exact big ask
the ad was designed to avoid, and the only other door is "Log in", which
is for people who already have an account. **A curious stranger has no
low-commitment way in.**

### Community performance (directional)

| Community | Impr | Clicks | CTR | CPC |
|---|---|---|---|---|
| mlb | 708 | 6 | **0.847%** | $1.50 |
| cfb | 1,355 | 11 | **0.812%** | $1.32 |
| nfl | 1,996 | 11 | 0.551% | $1.41 |
| nba | 1,777 | 9 | 0.506% | $1.56 |
| dynastyff | 224 | 1 | 0.446% | $1.48 |
| fantasyfootball | 822 | 2 | **0.243%** | **$1.65** |
| fantasybaseball | 84 | 0 | 0% | — |
| fantasybball | 69 | 0 | 0% | — |

**Rows do not add up and aren't meant to** — 7,035 impressions against a
3,743 total, because Reddit credits an impression to every community the
user matches. Relative only.

**The fantasy subs lose, and they were the premise.** The squad campaign
was built on "fantasy league players already have a group, bring it
here." r/fantasyfootball converts at a third of r/CFB's rate and costs
the most per click; the fantasy basketball and baseball subs produced 153
impressions and no clicks at all. The plain team subs win.

The likely reason is worth sitting with: **fantasy players already have
this product.** Sleeper, ESPN and Yahoo give a league a private chat and
a table that keeps itself. To them the squad pitch describes software
they already use. r/CFB and r/mlb argue all season with nothing keeping
score anywhere.

**Don't act on it yet.** 11 clicks against 2 is suggestive, not
decision-grade, and churning targeting at $34 spent throws away the read
you paid for. Let the flight finish on 15 Sep.

### General campaign is burning its window

`General — Sep 2026` has never delivered an impression: one ad rejected,
one pending more than twelve hours. Its end date is 15 Sep, so it is
spending its entire flight in a review queue. Either extend the end date
or write the flight off — but decide, rather than letting it expire by
default.

### The rejection is a gambling-policy rejection (10 Sep 2026)

The email arrived for both rejected ads and says the same thing:
*"Reddit places restrictions on the promotion of certain gambling and
gaming content."* It then lists **five canned reasons** — missing
certification, restricted country, **prohibited targeting methods**,
prohibited creative, prohibited country — without saying which applies.
It's boilerplate; the diagnosis has to come from controlled tests.

**The landing page is ruled out.** `gw-undefeated-squads-lp` pointed at
`/squads` — the same page the *approved* squads ad lands on — and was
rejected anyway. So `/feed` is not the problem, and the front page is not
what a reviewer is objecting to.

**That leaves the targeting**, which is also the one canned reason that
matches: r/sportsbetting is the only community in the general ad group
that Reddit's own picker files under Gambling, and the approved campaign
has none. It has been removed, leaving six sports and fantasy subs.

The test is now clean: `gw-undefeated-squads-lp` (rejected) and
`gw-undefeated` (pending) are identical — same creative, same `/squads`
landing page — except one carried r/sportsbetting and the other doesn't.
The rejected duplicate is deliberately left in place as the control.

**Correction to the previous entry.** Editing the *ad* does not put it
back in review. Editing the **ad group** does — saving the targeting
change flipped `gw-undefeated` from "Ad rejected" to "Pending approval"
on its own, no duplicate needed. The rule is: a rejection sticks to an ad
across ad-level edits, and clears when the ad group changes underneath it.

**Do not pursue gambling certification.** The first canned reason invites
it, and Reddit would presumably let a certified gambling advertiser
target these communities. Gwuap is not a gambling product, does not take
bets and holds no money — certifying as one to buy ads would file the
site under the exact category the whole 10 Sep repositioning existed to
escape, and it would be a false statement about what the product is.

**If the clean test passes, the strategic conclusion is:** Reddit will
not let this account address bettors *as bettors*. The audience is
reachable only through sports and fantasy communities — which is what the
squads campaign already does, and another argument for it being the
better of the two ideas.

### Reddit approved one ad and rejected the other (10 Sep 2026)

`sq-sports-group-chat` cleared review and is delivering.
**`gw-undefeated` was rejected.** Same account, same profile, same
creative template, same "Free to join" pill — so the cause is one of the
differences between them, and there are only two candidates:

| | Squads (approved) | General (rejected) |
|---|---|---|
| Lands on | `/squads`, an explainer | `/feed`, live picks with odds and stakes |
| Targeting | fantasy + team subs | **includes r/sportsbetting** |

**Reddit does not show the rejection reason anywhere in Ads Manager.**
The status cell, its hover, the ad's own Review page and the
notifications panel were all checked and none of them carries it. It goes
to the account owner by email; that email is the only hard evidence, and
without it the two candidates can't be separated by reading the dashboard.

**So the resubmit changes exactly one thing.** The new ad
`gw-undefeated-squads-lp` is identical except that it lands on `/squads`
instead of `/feed`. If it clears, the landing page was the problem — and
that matters far beyond this ad, because it would mean `/feed` itself
reads as a gambling page to a reviewer even after the 10 Sep cleanup.
The top of that page was fixed; the scoreboard rail, the odds and the
dollar stakes below it were not.

**Editing a rejected ad does not put it back in review.** The edit saves,
the toast says success, the destination really does change — and the
status stays "Ad rejected" forever. A rejection sticks to the ad. Use
**Duplicate**, which creates a new ad that enters review as "Processing".
The original stays rejected as a record and can't serve.

**First real numbers, squads campaign:** $23.01 spent, 2,291 impressions,
14 clicks, **$1.64 CPC**, 0.611% CTR. Against the archived campaign's
$0.90 CPC and 0.80% CTR — worse on both. Some of that is the price of
manual targeting, but not all of it, and the comparison is confounded
anyway: the old one was Max-targeted into a broad pool with a "no risk"
creative. Watch it rather than act on it. **Signups in the database
remain the number that decides anything.**

### "No active ad groups" usually means an ad is in review (10 Sep 2026)

Minutes after publishing, `General — Sep 2026` read **"Not delivering —
No active ad groups"** and its ad group read **"No active ads"**. Both
look like the misconfiguration that wasted the first campaign, and
neither is: the ad underneath said **"Pending approval"**. Reddit
propagates a pending ad upward as *nothing is active here*, which is
true and reads like a fault.

Check the **Ads** tab before touching anything. The symptom appears three
levels above its cause, which is the shape of failure this file exists to
record — and the wrong reaction (rebuilding a campaign that was fine) is
worse than waiting.

**The squads ad passed review.** That's the first evidence since the X
flag that the cleaned creative and the "Free to join" pill clear a
platform check. If `gw-undefeated` is instead rejected, that's
information too — it is the campaign carrying r/sportsbetting, the one
community Reddit's own picker files under Gambling.

### Two campaigns live, first one archived (10 Sep 2026)

**`Squads — Sep 2026` is running** — Standard (not Max), Traffic, US
only, automated targeting off, eight fantasy/team communities,
`sq-sports-group-chat`, $20/day to 15 Sep, landing on `/squads`.

**`General — Sep 2026` is built and unpublished** — same shape, $20/day,
`gw-undefeated`, landing on `/feed`.

**The first campaign is archived, not deleted.** Reddit's menu offers
both, and the fine print under Totals reads *"excludes deleted
entities"* — deleting would have taken the $52, the 7,248 impressions and
the per-asset breakdown showing `02-300.png` at 1,333 impressions out of
reporting. That breakdown is the evidence for what went wrong and this
file cites it. Archive retires a campaign for good and keeps the record;
delete destroys the thing that stops the mistake being repeated.

**Reddit's own picker labels r/sportsbook as "Gambling"** — along with
r/BettingPicks and r/sportsgambling. That's Reddit's taxonomy, not a
judgement of ours, and it's the reason r/sportsbook was left out of the
general campaign: concentrating against that tag on an account X already
flagged risks an account-level problem, and that would take the live
squads campaign down with it. r/sportsbetting stays — bettors are the
audience — and r/sportsbook waits for a few clean days.

**Two silent failures in Reddit's builder, both caught only on the review
screen:**

- **Bulk community entry dropped one line without a word.** Eight subs
  pasted, seven arrived. Count the chips against what you pasted.
- **The form scrolls under you between steps.** An ad name and headline
  typed at remembered coordinates went nowhere, and a click meant for a
  text field landed on a suggested-community chip and added
  r/wallstreetbets to a sports campaign. Screenshot before every typed
  field, and read the review screen before publishing rather than
  trusting that what you entered is what's there.

### The Reddit campaign had been running for six days (10 Sep 2026)

**It was live the whole time this file said nothing had been advertised.**
Opening ads.reddit.com to set up the campaign the run sheet describes
found that campaign already Active, and the dashboard's opening $0.00 is
a loading state — the real numbers arrive a second later.

| | |
|---|---|
| Spent | **$52.00**, 4-10 Sep |
| Impressions | 7,245 |
| Clicks | 58 |
| CPC / CTR | $0.90 / 0.801% |
| Signups it produced | **not yet measured — see below** |

It spent 4-6 Sep, went quiet three days, and was spending again on the
10th (~$16 that day) when it was switched off. **Campaign is now
Inactive.** Nothing else about it was changed.

**It was serving the retired creatives.** Delivery went almost entirely
to the *first* asset set, not the audited v2 ones:

| Asset | Impressions | Clicks |
|---|---|---|
| `05-norisk.png` | 4,553 | 43 |
| `02-300.png` | 1,333 | 9 |
| `03-settled.png` | 516 | 4 |
| `04-receipts.png` | 494 | 0 |
| `01-free.png` | 343 | 1 |

`02-300.png` is the **$300 contest ad**, of which this file says "Never
run these — they'd land people on a page with no prize on it, which is
the worst possible first impression for a site whose entire pitch is that
it doesn't lie to you." Nine people clicked it and got exactly that.
`01-free.png` is on the do-not-use list for saying "no deposit", the
wording that got the X account flagged. None of the clean v2 creatives
(`10-receipts-clean`, `09-keep-score`) delivered a single impression.

**What this costs is the record, not the $52.** Two documents said no ad
had ever run while one was running, so nobody knew to look at what it was
running or what it brought back. A channel that was tried and a channel
that was never tried are the distinction this section exists to make, and
for six days it made the wrong one.

**Still to do, in this order:**

1. **Count the real signups from the database for 4-10 Sep.** 58 clicks
   at $0.90 is the ad platform's number; the database is the one to
   trust, and the campaign carried UTM tags for exactly this. Until this
   is counted we do not know whether $52 bought anything.
2. Detach every asset in the first set from the ad group, so nothing can
   serve the contest ad again if the campaign is ever switched back on.
3. Rebuild per the run sheet — `10-receipts-clean-sq.png`, the Traffic
   objective, the UTM URL, US-only, an end date — and leave the last
   click to a person.

### The targeting test failed too — and Reddit's verdict (11 Sep 2026)

**`gw-undefeated` was rejected again**, with r/sportsbetting removed. So
the second controlled test failed as well, and both hypotheses are dead:

| Variable changed | Result |
|---|---|
| Landing page `/feed` → `/squads` | **rejected** |
| Targeting, r/sportsbetting removed | **rejected** |

Neither the landing page nor the gambling-categorised community was the
cause. The only difference left between the approved ad and the rejected
one is **the creative and its headline**.

Which points somewhere specific: `sq-sports-group-chat` says "THE SPORTS
GROUP CHAT / Everyone called it. Nobody wrote it down." and passes.
`gw-undefeated` says **"EVERYONE'S UNDEFEATED / Until somebody keeps
score."** On a sports-betting-adjacent account, *undefeated* reads as a
claim about a winning record — and claims about winnings are exactly
what gambling ad policies restrict. Untested, but it is the last variable
standing and it fits.

### Reddit: pause. The numbers

| Channel | Cost | Clicks | Signups |
|---|---|---|---|
| Reddit, squads campaign | **$34.22** | 25 | **0** |
| Polymarket message | **$0** | — | **2** |

Accounts went 6 → 8 on 11 Sep: `ijmors` and `gmt800goat`, 17:50 and
17:51, one minute apart. **Both from Polymarket. Neither from Reddit.**

Three further reasons, beyond the obvious one:

- **The campaign has stalled anyway.** Spend has sat at $34.22 since 10
  Sep with roughly ninety more impressions and no new clicks. It is not
  spending its $20/day.
- **Half the experiment never ran.** `General — Sep 2026` reads "No
  active ad groups" because both its ads are rejected, so the
  general-vs-squads comparison was never made.
- **The argument for continuing is answered for free.** The one thing
  Reddit could still teach is whether the new `/squads` front door
  converts — and the Polymarket message points at `/squads` too, so that
  gets tested either way at no cost.

**One thing to be fair about: the front door has never been tested.** All
25 clicks landed before it shipped. Reddit's 0-from-25 is a verdict on
the *old* page, not the new one — so this is a pause, not a conclusion
that the channel can't work.

### Two rules about picks changed (11 Sep 2026)

**MIGRATION 050 MUST RUN BEFORE THIS DEPLOYS.** The record page and the
squad table both select `late_entry`; without the column the query fails
and a profile with 53 settled picks renders *"Nothing settled yet"*.
Verified locally — that is exactly what it does.

#### The line only has to be near the book's

`lineIsFromBook` demanded an exact match against a line ESPN gave us, and
was flagging honest picks as "under review" — a real pick on the blocca
account is what surfaced it. **Books genuinely disagree.** Our source is
one book; somebody betting at another sees a different spread, and -2.5
when we have -3 was never dishonest.

`LINE_TOLERANCE = 2` now. Wide enough to absorb that disagreement, narrow
enough to still catch a number nobody published — "under 1,000,000",
which is what the check exists for.

**The cost, stated rather than buried:** a pick grades against the line
its author posted, not the book's, because a pick's terms are immutable
and rewriting them would be worse. So the tolerance also lets a slightly
easier number count. That's the deliberate trade — refusing real picks
was doing more damage than a two-point drift, because a board that
rejects honest entries is a board nobody posts to.

#### Late entries are a category, not a void

Grace goes from **5 minutes to 15** — five was catching people who opened
the form before kick-off and typed slowly.

Past that, a pick used to be **voided**: settled as neither win nor loss,
touching nobody's record. That threw away a real result. Somebody posting
at twenty minutes did call something and the scoreboard does settle it —
it just isn't the same claim as a pick made before the whistle.

So late picks now **grade like any other and are kept apart**:

| | |
|---|---|
| Graded | yes, identically |
| In the record | **no** |
| On the leaderboard | **no** (the view filters it) |
| On the squad table | **no** |
| Where they show | their own section on `/profile/<user>/record` |

`gradePick` no longer blocks on lateness at all — `'late-entry'` is gone
from `Blocked`. The grading job calls `isLateEntry` separately and writes
the flag. Splitting the two is what lets a late pick count as a pick
without the record quietly overstating itself.

#### "cannot drop columns from view", and why that error saved us

The first version of 050 rebuilt the leaderboard from **037** and
Postgres refused it: `ERROR: 42P16: cannot drop columns from view`.

**`CREATE OR REPLACE VIEW` may only append columns — never drop or
reorder them.** The live view had a thirteenth column, `is_bot`, added by
**038**, which 037 knows nothing about.

Rebuilding from the stale definition would have silently done three
things, and only the first was visible:

1. dropped the `is_bot` column
2. **put back `and p.is_bot = false`**, taking the house model off the
   leaderboard — the exact thing 038 existed to change
3. dropped `security_invoker`, set by **015**, so the view would have run
   with the definer's permissions instead of the caller's

The error was the only thing that caught any of it. 050 is now built from
038 verbatim plus one line, and re-sets `security_invoker` explicitly.

**How 038 got missed:** grepping for `create or replace view leaderboard`
matched 001, 007, 030 and 037 but not 038, whose CREATE line is phrased
differently. **List every migration mentioning the view's name** — there
are sixteen — **and read the newest, rather than grepping for the CREATE
statement.** 038's own header warns about this precise failure, because
037 had already made it once by dropping `p.badges`. That's twice now.

**Already-voided late picks stay voided.** Regrading them would rewrite
settled history under a rule that didn't exist when they were posted, and
this site's claim is that a posted record doesn't move under you.

### The site installs to a home screen now (11 Sep 2026)

**Two people signed up from a Polymarket group and went straight back to
the group chat, saying they'd rather use an app with push
notifications.** That's the first specific, fixable reason anyone has
given for leaving — every other churn signal has been silence.

So it's a PWA. `app/manifest.ts`, three icon sizes, a service worker, and
an install banner. Added to a home screen it opens standalone: no
address bar, its own entry in the app switcher, dark splash screen.

**Deliberately not an App Store build.** A Capacitor wrapper would put
this in front of App Review, and in one week this site has been
classified as gambling by X's ad classifier and rejected under Reddit's
gambling policy. Apple's guideline 5.3 is a third gatekeeper, with a
licensed-operator bar and a review loop measured in days rather than
minutes — and guideline 4.2 rejects thin website wrappers besides. A
home screen icon is most of what an app gives this product. **Having no
gatekeeper is a feature here, not a compromise.**

**The service worker caches nothing, on purpose.** It exists because
Chrome won't offer to install without one and push has nowhere to be
delivered without one. Caching is the third thing it could do and
mustn't: nearly every page is live scores, a running game chat or a feed
that moves by the minute, and a stale cache there shows somebody a final
score that isn't. Slightly slower beats quietly wrong.

**Both iOS capable tags ship.** Next emits the standardised
`mobile-web-app-capable`; iOS has honoured the Apple-prefixed name for
years and only recently learned the standard one. Getting this wrong
means "Add to Home Screen" opens a Safari tab *with* chrome — precisely
the thing people said they wanted to escape.

**Android and iOS install completely differently and the banner knows
it.** Android fires `beforeinstallprompt` and the browser does the work.
**iOS has no such event and never will** — Safari installs only from
Share → Add to Home Screen, so iOS gets instructions rather than a
button, and only in Safari, since no other iOS browser has the menu
item. The classic PWA mistake is one beautiful Install button that
silently does nothing on half the phones.

**Verified by simulating `beforeinstallprompt`**, because it doesn't fire
in an automated Chrome — banner appears, Install calls through to the
browser prompt, banner clears. Same lesson as Clarity: browser
heuristics can't be tested from automation, so test your own code
deterministically instead.

**Push is not built yet, and it's the actual payoff.** The service worker
already has `push` and `notificationclick` handlers. On iOS push only
works once the app is on the home screen, which is why installability
came first.

**Migration 049 is written and NOT YET RUN.** `push_subscriptions`, plus
a `profiles.push_enabled` switch. Run it in the Supabase SQL editor
before any push code ships — *the single most common failure in this
project is a migration that didn't run, and the symptom is always a
feature that quietly does nothing.*

Two decisions baked into that table, worth not re-litigating later:

- **One row per browser, not per person.** A push subscription belongs to
  a browser install, so the same account on a phone and a laptop is two
  endpoints and pushing to one isn't pushing to the other. The endpoint
  URL is the primary key, so re-subscribing updates rather than piling up
  duplicates that all deliver the same notification.
- **Dead endpoints are marked, not deleted.** A 404/410 from the push
  service sets `failed_at`. Deleting on the spot means one broken send
  run can silently empty the table, and there'd be no way to see how many
  installs have gone stale.

Still needed after the migration: VAPID keys in Vercel, a subscribe
prompt, and a send path on the notification events that already exist —
reactions, comments, replies, follows, graded picks.

### Clarity out, PostHog in

Clarity was deleted after nine days of recording nothing across two
projects, two devices and every configuration check available.
`components/PostHog.tsx` replaces it — same `/vent`, `/messages`,
`/reset` exclusions, same opt-out-on-navigation guard rather than an
unmount, inputs masked in replays. **Inert until
`NEXT_PUBLIC_POSTHOG_KEY` is set**, which needs a PostHog account. The
privacy page names PostHog now, because a policy describing a different
site than the one running is worse than none.

The reason for PostHog over another replay tool is the funnel: the open
question is where people go between landing and not signing up, and
neither Clarity nor Vercel Analytics could answer it.

### Polymarket group chats: 160 people, 0 signups (11 Sep 2026)

**The best-performing channel so far, and it still converted nobody.**
Posted into the comments of several Polymarket game markets:

> *"Does anyone else wanna join the polymarket squad for Sports betting.
> Just like this message and I'll send an invite ASAP IM MAKING THE
> BIGGEST POLYMARKET SQUAD. BE APART OF IT. TAKES 10 SECONDS"*

**Two groups, 80 members each, in 24 hours. Free.** For contrast, $86 of
Reddit ads bought one signup.

**Then those 160 people were asked to join gwuap.co and ignored it.**

| Channel | Cost | Reach | Signups |
|---|---|---|---|
| Reddit ads | $86.22 | 83 clicks | ~1 |
| X ads | $0 | halted before delivering | 0 |
| Polymarket groups | $0 | **160 members** | **0** |

**Three channels, one answer: acquisition is not the problem.** This site
can put people in front of itself for free. What it cannot yet do is give
them a reason to make an account.

**Why that particular ask failed, and it's instructive.** Those 160
joined a *Polymarket* squad, for Polymarket reasons. Being asked to go
set up an account somewhere else is a switch on what they signed up for —
so "come use my website" reads as a favour being requested, not an offer
being made. The audience was right and the message was wrong.

**The reframe to test: don't ask people to try a product, ask them to
settle an argument.** A group chat structurally cannot tell you who in it
was right, and that is the only thing this site has that Polymarket's
chat doesn't. So the pitch to an existing group is not "check out my
site", it's *"who in here is actually good — let's find out"*, with the
grading and the leaderboard as the mechanism.

Messages drafted for both cases — recruiting new members with the filter
built in, and re-approaching the 160 already gathered — are in
`~/Desktop/gwuap-ads/README.md`.

**If both fail, that is the most valuable result available.** It would
mean the problem is neither the channel nor the framing, and the answer
is in the product rather than the pitch. Worth knowing before any more
money goes into ads.

### The X pixel is live and verified (9 Sep 2026)

Pixel `rezpf`, signup event `tw-rezpf-rf4l3`, both as `NEXT_PUBLIC_`
variables in Vercel Production. Verified properly rather than assumed:
X recorded Sign Up at 10:21 AM ET and `@tester123` was inserted at
14:21:18 UTC. Same moment. Pixel loaded, event fired, X received it, real
row in the database.

Reddit's pixel is also installed and predates this. Both stay out of
`/vent`, `/messages` and `/reset`, and both are named on the privacy
page.

**Three things learned getting there, all of which cost time:**

- **`NEXT_PUBLIC_` values are baked in at build time.** Saving the
  variable in Vercel changes nothing until you redeploy. This is the step
  that looks done and isn't.
- **Don't test a pixel in Safari, least of all Private Browsing.**
  Safari's tracking prevention blocks `redditstatic.com` outright and
  restricts `t.co`/`twitter.com`. A signup made there fires nothing, and
  the dashboard is indistinguishable from a pixel that was never
  installed. That's what the first failed test was.
- **A hard navigation after firing a pixel loses the event.**
  `/claim-username` set `window.location.href` immediately after firing
  both tags, which tears the page down while the request is still queued.
  `flushPixels()` in `lib/twq.ts` waits 350ms first. `/signup` never had
  the problem — it changes step without leaving the page.

**Expect permanent under-reporting and don't read it as broken.** Safari
does this to every pixel on every site, and iOS Safari is a large slice
of a mobile-first sports audience. Judge a campaign on real signups in
the database against spend, not on X's conversion count — the two will
not agree and the database is the one that's right. The Conversion API
is the fix for that gap and is deliberately not built: it's a real piece
of work and there's no volume yet to justify it. Revisit when spend is
large enough that the optimiser being half-blind actually costs money.

### Assets

`~/Desktop/gwuap-ads` — outside the repo, because the PNGs are ~300KB
each and git is the wrong place for them. It has its own README.

- `v2/` — seven concepts for a Reddit signup campaign, 8 Sep 2026, each
  at 1080×1080 (feed) and 1200×628 (link ads). Sources are plain HTML
  rendered by headless Chrome; `v2/generate.mjs` rebuilds the set.
- `retired/` — `01-free` and `02-300`, both advertising the $300 contest.
  **Never run these.** They'd land people on a page with no prize on it,
  which is the worst possible first impression for a site whose entire
  pitch is that it doesn't lie to you.

### Two things learned making them

- **A creative that quotes a live number expires.** The house model's
  record was 17-25 when the ad was generated and 19-25 forty minutes
  later, because grading ran in between. `generate.mjs` now reads the
  leaderboard at render time, and there's a number-free variant (`07`)
  for when regenerating before a flight isn't practical.
- **The ad has to be the same green as the landing page.** The creatives
  take `#00C805` from `lib/brand.ts`, the same constant the site and the
  emails use. A near-miss green between ad and page is the first thing
  that reads as a phishing attempt.

### The landing page read as a sportsbook (10 Sep 2026)

X escalated the flag to fraud and gambling and the campaign went to
appeal, which means a human opens gwuap.co. Loading it the way a reviewer
would showed why:

- **"DraftKings" appeared 41 times on one page load.** The `booked` stamp
  printed the sportsbook's name on every house-model pick. There is no
  relationship with DraftKings — printing their brand implies one that
  doesn't exist, so the stamp now reads **"book price"** with the book on
  hover. That's *more* accurate, not less, and it keeps the trust claim
  the stamp is actually for: the number came from a posted market rather
  than being typed in.
- **The first 700 characters were point spreads.** `LAR -3.5 o/u 48.5`
  and so on, before a single word of what the site is. A logged-out
  visitor now meets `components/WhatThisIs.tsx` above the scoreboard:
  picks settled by the final score, free, nothing to deposit, not a
  sportsbook, doesn't take bets. That's for the stranger arriving from an
  ad as much as for the reviewer — both were being asked to infer it.

**Syndicated headlines are filtered too** (`readsAsBetting` in
`lib/news.ts`). Outlets file a lot of "Team A vs. Team B odds, picks,
prediction, betting preview" — their business, not ours, and once it's in
our rail a reader can't tell our copy from a feed we pulled in. Two of 21
dropped when it was written. The filter lives in `fetchNews`, so it
covers the rail, the news page and the come-back emails at once.

`picks` is deliberately **not** in that list: it's this site's own word,
"NFL Week 1 picks: our experts face off" is an ordinary headline, and
filtering it would halve the rail for nothing.

Matching is on **whole words**. The first version anchored only the start
and matched "Mookie Betts" and "the better team" — quietly deleting
ordinary baseball news to remove a betting preview. `gambl` and
`handicapp` stay stems, because everything built on them is meant.

**Odds themselves stay, and that's a product decision rather than a
concession.** They're what lets somebody show they got in at a good
number, and what makes a record traceable over time — the same data that
would make closing-line value computable later, since the price and the
timestamp are both already stored. The goal is to stop the page *reading*
as a sportsbook, not to hide what it does.

### The words the page still had (10 Sep 2026)

Cleaning the front page didn't clean the visit. Three surfaces the same
stranger meets were still running the flagged vocabulary, and one of them
was worse than anything on the page itself:

- **The welcome modal**, which opens to *logged-out* visitors fifteen
  seconds in or 600px down, said **"$0 to play. No deposit, no card, no
  stake."** — three flagged phrases at once, in a takeover over a page
  that had just been cleaned. That is precisely the reviewer's session:
  they open gwuap.co, read for fifteen seconds, and the site covers its
  own explanation with the campaign's exact wording. It now reads "Free
  to join. No card, ever." / "Costs nothing. We never ask for a card."
- **The site's OG card** (`app/opengraph-image.tsx`) ended in a green
  pill reading "Free. No deposit, nothing at stake but your record." That
  card is attached to the ad's link and to every share of gwuap.co, so
  it is ad copy whether or not it was written as ad copy — and the two
  audited-clean creatives in `~/Desktop/gwuap-ads` had already settled on
  **"Free to join"** for exactly this pill. It says that now.
- **Two public link-landing pages** — a challenge invite (`/c/[code]`)
  and a squad page — both said "nothing to deposit" to a cold visitor.

**The rule this settles:** prose a person reads in context keeps the
denial; a slogan stripped of context doesn't get to use the vocabulary.
`/help` and `/privacy` still say "nothing is deposited, staked or paid
out" and "nothing here is gambling — no deposits, no stakes, no payouts",
because saying so is the entire job of those two pages and nobody reads
them by accident. A pill in an image and a headline in a modal have no
such context, and a classifier scores the words the same whether they
affirm or deny.

`WhatThisIs` was rewritten under the same rule a day after it was
written. It kept the explicit denial — "We're not a sportsbook and don't
take bets", which is the sentence the human reviewer needs — and dropped
"nothing to deposit and no money on the line" for "we never ask for a
card". That reads better to a person as well: it's concrete and
checkable, where "nothing to deposit" borrows the sportsbook's own
vocabulary to claim not to be one.

Measured on a real logged-out page load: deposit, stake, wager, gambl,
parlay and payout all **0** in visible text; "sportsbook" appears once,
in our own denial.

**One caveat on yesterday's "DraftKings 41 → 0".** That is true of what a
person reads, which is what was claimed — but the served HTML still
carries the string 82 times: 41 in the `title` attribute that names the
book on hover, and 41 in the RSC payload behind it. The hover is
deliberate and stays, because naming the book is the accuracy the stamp
exists for. Recorded so the 0 isn't read as more than it is: a crude
classifier reading raw HTML sees 82.

### X flagged the first campaign as gambling (9 Sep 2026)

*"Your ad text reads as Gambling and Games Content."* Four signals: the
ad account is `@Gamblenchill`, the keyword list was full of sportsbook
vocabulary, the look-alikes were books and a prediction market, and the
creatives and copy said "no deposit", "$0 to play" and "nothing at
stake" — gambling words even when used to say the opposite.

The full post-mortem, the cleaned targeting, the word list to avoid and
the creatives that passed the audit are in `~/Desktop/gwuap-ads/README.md`.
Two things worth carrying here:

- **The classifier reads the whole campaign, not the creative.** Keyword
  targeting that reads as gambling halts an ad however clean the post is.
  The guidance that targeting could use the audience's vocabulary while
  creatives avoided it was wrong as written.
- **The handle is the strongest signal and the hardest to fix.** An ad
  from `@Gamblenchill` pointing at a site whose whole pitch is
  trustworthiness is working against itself twice — once at review, once
  with the stranger reading it. A Gwuap-branded X account is the real fix.
  **Update 11 Sep: it was done.** The ad account is `Bloccaa`
  (`18ce55xag4u`) and the ad posts as **@gwuapco**. See the next section
  for what happened anyway.

### X declined the appeal (seen 11 Sep 2026)

The appeal recorded as pending on 10 Sep has been **declined**. The
campaign toggle still reads Active; the **delivery status is Halted**
with *"Appeal declined"* under it. Started 9 Sep, and as of 11 Sep:
**0 impressions, $0.00 spent, 0 clicks.** It has never delivered
anything.

**It was declined with the two obvious fixes already in place.** The
account posts as **@gwuapco**, not @Gamblenchill, so the handle argument
above was already answered. And the live post's copy is clean — *"Say
what you think happens before the game starts. The final score settles
it, nobody grades…"* — no word from the banned list. X still said no.

**Two platforms now point at the same cause.** Reddit's rejection cited
*prohibited targeting methods* and the only gambling-categorised
community in the ad group; X halted a campaign whose creative and handle
are clean. What both campaigns still share is **targeting built out of
sportsbook vocabulary and book/prediction-market look-alikes**, plus
whatever classification the account picked up on the first pass. The
creative was never the thing.

**Do not launch a new campaign on this X account to test the theory.** A
declined appeal is not the same as a rejection: the next violation risks
suspension, which costs the channel permanently rather than costing a
week. Before anything else runs there, the old ad group's keyword and
look-alike targeting needs reading and clearing, and X support is worth
asking what specifically classifies the account — a declined appeal
usually comes with a route to a human.

**Meanwhile Reddit is the live channel** and the squads campaign is
delivering, which is the first paid traffic this site has ever actually
received.

### The pitch, and what it deliberately avoids

No guarantees, no win rates, no implied edge, no money anyone could make.
The product is a record that can't be faked, so an ad that overclaims
undercuts the only thing being sold. Two of the seven creatives lead with
the house model *losing* on purpose — on Reddit that reads as proof, and
it's the least copyable thing about the site.

### Before spending anything

- `NEXT_PUBLIC_REDDIT_PIXEL_ID` is set in Vercel and the pixel defaults
  to off. Turn it on and confirm a signup registers as a conversion
  *before* buying traffic, or the spend teaches you nothing.
- The privacy page was written for exactly this moment. Re-read it once
  against what the pixel actually sends.
- Email confirmation is still OFF (see Known gaps). Strangers arriving
  from an ad is precisely the case it's off for — decide deliberately
  which risk you prefer before the first click lands.

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

*Last updated 7 Sep 2026: brought current after four undocumented days
(house account, email digests, receipts, the contest added and removed),
and the counts in YOU ARE HERE re-read from the live database rather than
remembered. Update this file as we make new decisions so it stays the
source of truth — and re-read the numbers rather than trusting the ones
above, which is how they went 19 migrations stale.*
