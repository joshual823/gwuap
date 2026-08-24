# Chalk — sports betting social network (MVP)

A working starter covering all 13 core features:
signup/login, profiles, follow/unfollow, posts, bet-slip images, likes,
comments, pick categories, win/loss tracking, leaderboard, user search,
report/block, and admin moderation.

Stack: **Next.js 14** (App Router) + **Supabase** (Postgres + Auth + Storage).
Both have free tiers generous enough to run a real MVP at $0/month.

## 1. Set up Supabase (free)

1. Create a project at https://supabase.com (free tier).
2. Go to the **SQL Editor** and run the contents of `supabase/schema.sql`.
   This creates every table, the leaderboard view, and Row Level Security
   policies — RLS is what stops users from editing each other's data.
3. Go to **Storage** → create a new **public** bucket named `bet-slips`.
   This is where uploaded bet-slip screenshots are stored.
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (admin-only, never expose in the browser)
5. To make yourself an admin: after signing up in the app once, run in
   the SQL editor:
   ```sql
   update profiles set is_admin = true where username = 'your_username';
   ```

## 2. Configure the app

```bash
cp .env.example .env.local
# paste in your Supabase URL + keys
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 3. Deploy for free

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → New Project → import the repo.
3. Add the same three environment variables from `.env.local` in
   Vercel's project settings.
4. Deploy. You get a free `*.vercel.app` URL immediately; you can attach
   a custom domain later (~$10–12/year from any registrar) once you want
   one.

**Total cost to launch: $0/month** (Vercel Hobby + Supabase Free tier).
You'll only start paying if you outgrow the free tiers — Supabase free
covers 500MB database + 1GB storage + 50k monthly active users, which
is far more than enough for an MVP.

## What's built vs. what's a starting point

Built and working end-to-end:
- Real signup/login (Supabase Auth, email + password)
- Public profiles with bio, follower/following counts, record
- Follow / unfollow
- Create a post with category, odds, stake, caption
- Upload a bet slip screenshot (Supabase Storage)
- Like / unlike posts
- Comment counts wired up (see note below)
- Pick categories (NBA, NFL, MLB, etc. — editable in `categories` table)
- Win/loss/push grading on your own posts, feeding your record
- Leaderboard (SQL view, 30-day win %, min. 5 graded picks)
- Search users by username
- Block and report a user
- Admin moderation queue: view open reports, ban users, remove posts

Left as a quick next step (structure is already in place):
- `app/post/[id]/page.tsx` — single post detail page with a comment thread
  UI (the `comments` table, RLS, and comment counts already work — only
  the dedicated page + comment form UI needs to be added, following the
  same pattern as `ProfileActions.tsx`)
- Feed filtering by "following" vs. "everyone" and by category
- Email verification UI polish (Supabase sends the email automatically;
  you may want a "check your inbox" screen)
- Avatar upload (same pattern as the bet-slip upload)
- Rate limiting on posting/reporting to prevent spam (Supabase has
  built-in options, or add a simple check in the insert RLS policy)

## Design

The visual identity blends three references: Instagram's clean white
card-based feed, Twitter's tight sticky top bar and follow-pill buttons,
and ESPN's bold scoreboard energy for stats — a condensed heavy display
face (Barlow Condensed) for headlines, records, and win-rate numbers, a
red "score-bug" badge for league tags and win/loss stamps, and a
horizontally-scrolling league chip row (NBA / NFL / MLB / …) at the top
of the feed for filtering, styled like ESPN's sport selector / Instagram's
stories row. Tokens live in `app/globals.css`.
