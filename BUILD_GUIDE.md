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
5. Dollar amounts, odds/stake dropdowns, unverified badge
6. DM requests (permission-based)
7. League chat rooms + the moderated Vent room
8. Polish + invite real testers

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

## Session 4 — Deploy it live

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
- [ ] Create a free Vercel account, import the repo
- [ ] Add the same 3 environment variables in Vercel's project settings
- [ ] Deploy
- [ ] Visit the `*.vercel.app` URL and confirm everything still works
      (signup, posting, likes — all pointed at the same Supabase project)
- [ ] Also revisit: re-enable "Confirm email" in Supabase with a real
      email provider (or make a deliberate decision to leave it off) —
      it's currently OFF for local testing only

**What "done" looks like:** you can text a friend a link and they can
actually use the site, on their phone, and it looks the way it's supposed to.

---

## Session 5 — Dollar amounts + form polish

- [ ] Add dollar fields to picks (amount risked, amount won/lost)
- [ ] Update the leaderboard to show total $ profit alongside win %
- [ ] Update the post card UI to show the $ amount
- [ ] Replace the free-text odds field with a structured picker
      (Moneyline / Spread / Total, +/-, number input)
- [ ] Replace the free-text stake field with a quick-select dropdown
      ($10 / $25 / $50 / $100 / $250 / Custom)

---

## Session 6 — DM requests

- [ ] Build the conversations/messages tables
- [ ] Build the request → accept/decline flow
- [ ] Build the actual message thread UI

---

## Session 7 — Chat rooms + Vent room

- [ ] Build the realtime chat room feature for league categories
- [ ] Build the Vent room specifically:
  - [ ] Exclude "Vent" from pick categories / leaderboard / win-loss tracking
  - [ ] Pin crisis resources at the top of the room (e.g. National Problem
        Gambling Helpline, 1-800-522-4700)
  - [ ] Pin visible room rules
  - [ ] Route reports from this room into a flagged, priority queue

---

## Session 8 — Polish + invite real testers

- [ ] Fix rough edges from the previous sessions
- [ ] Seed the feed with 15–20 of your own real picks before inviting anyone
- [ ] Recruit 3–5 friends who actually bet to post too
- [ ] Invite testers, actually watch how they use it, take notes

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
- **Verification:** picks are self-reported for now, marked "Unverified."
  Real verification (SharpSports API, connects to actual sportsbook
  accounts) is a paid, later-stage feature — not free, not urgent
- **Not doing yet:** live scores integration, native app, paid ads,
  monetization — all deliberately deferred until there's real traction
- **Verified badge policy:** "Verified" must always mean a real connected
  sportsbook account, never just a paid subscription — paid tiers (if
  added later) should be named and framed separately so money never buys
  the appearance of a trustworthy track record
- **Moderation:** you're moderating everything yourself at first,
  especially the Vent room, until it's proven out

---

*Last updated after approving the mobile-first StockTwits/Twitter/Instagram
hybrid mockup. Update this file as we make new decisions so it stays the
source of truth.*
