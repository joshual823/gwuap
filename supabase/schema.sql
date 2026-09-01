-- ============================================================
-- CHALK — sports betting social network
-- Supabase (Postgres) schema. Run this in Supabase SQL editor.
-- Auth is handled by Supabase Auth (auth.users) — this schema
-- extends it with a public "profiles" table (1-to-1 with auth.users).
-- ============================================================

-- 1. PROFILES  (feature 1, 2: signup/login handled by Supabase Auth;
--    this table is the public profile)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  is_admin boolean default false,
  is_banned boolean default false,
  created_at timestamptz default now()
);

-- Unique, and case-insensitive: "Josh" and "josh" must not coexist.
create unique index profiles_username_lower_idx on profiles (lower(username));

-- 2. FOLLOWS (feature 3)
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- 3. PICK CATEGORIES (feature 8)
create table categories (
  id serial primary key,
  name text unique not null   -- NBA, NFL, MLB, NHL, Soccer, UFC, Golf, Other...
);
insert into categories (name) values
  ('NBA'), ('NFL'), ('MLB'), ('NHL'), ('Soccer'), ('UFC'), ('Boxing'), ('Tennis'), ('Golf'), ('College Football'), ('College Basketball'), ('Other');

-- 4. POSTS (feature 4, 5, 6 relation target)
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade,
  category_id int references categories(id),
  caption text,
  slip_image_url text,        -- uploaded betting slip screenshot (Supabase Storage)
  tag text,                   -- short cashtag-style label, e.g. "$LAL -4.5"
  tag2 text,                  -- optional opponent cashtag, for totals
  -- backing/fading for team bets; over/under for totals and props
  sentiment text default 'backing' check (sentiment in ('backing','fading','over','under')),
  post_kind text not null default 'pick' check (post_kind in ('take','pick')),
  bet_type text default 'moneyline' check (bet_type in (
    'moneyline','spread','total','player_prop','team_prop','parlay','future','other')),
  odds text,                  -- American odds as entered, e.g. "+150", "-110"
  stake numeric,              -- dollars risked
  currency text default '$',  -- USD only as of Session 5; kept for old rows
  potential_payout numeric,
  profit numeric,             -- dollars won (+) / lost (-) once graded; NULL while pending
  status text default 'pending' check (status in ('pending','win','loss','push','void')), -- feature 9
  created_at timestamptz default now(),
  -- A take is never gradeable and carries no money; enforced here rather
  -- than only in the UI, since the anon key ships in every browser.
  constraint posts_take_not_graded_check check (post_kind = 'pick' or status = 'pending'),
  constraint posts_take_no_money_check check (
    post_kind = 'pick'
    or (odds is null and stake is null and profit is null and potential_payout is null))
);

create index posts_author_idx on posts (author_id, created_at desc);
create index posts_category_idx on posts (category_id, created_at desc);

-- 5. LIKES (feature 6)
create table likes (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  emoji text not null default '♥' check (char_length(emoji) between 1 and 8),
  created_at timestamptz default now(),
  primary key (user_id, post_id)   -- one reaction per person per post
);

-- 6. COMMENTS (feature 7)
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index comments_post_idx on comments (post_id, created_at);

-- 7. REPORTS (feature 12)
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete cascade,
  reported_user_id uuid references profiles(id) on delete cascade,
  reported_post_id uuid references posts(id) on delete cascade,
  reason text not null,
  status text default 'open' check (status in ('open','reviewed','dismissed','actioned')),
  created_at timestamptz default now()
);

-- 8. BLOCKS (feature 12)
create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ============================================================
-- LEADERBOARD VIEW (feature 10) — win rate, record, and total $
-- profit per user, last 30 days, minimum 5 graded picks to qualify.
-- ============================================================
create or replace view leaderboard as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  count(*) filter (where posts.status = 'win') as wins,
  count(*) filter (where posts.status = 'loss') as losses,
  count(*) filter (where posts.status = 'push') as pushes,
  count(*) filter (where posts.status in ('win','loss')) as graded_picks,
  round(
    100.0 * count(*) filter (where posts.status = 'win')
    / nullif(count(*) filter (where posts.status in ('win','loss')), 0), 1
  ) as win_pct,
  round(
    coalesce(sum(posts.profit) filter (where posts.status <> 'pending'), 0), 2
  ) as total_profit,
  -- Picks old enough to have resolved that were never graded. Without
  -- this, never grading your losses reads as a perfect record.
  count(*) filter (
    where posts.status = 'pending' and posts.created_at < now() - interval '7 days'
  ) as ungraded,
  round(
    100.0 * count(*) filter (where posts.status <> 'pending')
    / nullif(count(*) filter (
        where posts.status <> 'pending' or posts.created_at < now() - interval '7 days'
      ), 0), 0
  ) as graded_pct
from profiles p
join posts on posts.author_id = p.id
where posts.created_at > now() - interval '30 days'
  and p.is_banned = false
  and posts.post_kind = 'pick'
group by p.id, p.username, p.avatar_url
having count(*) filter (where posts.status in ('win','loss')) >= 5
   -- Grade at least 80% of your resolved picks or you don't rank.
   and coalesce(
     round(
       100.0 * count(*) filter (where posts.status <> 'pending')
       / nullif(count(*) filter (
           where posts.status <> 'pending' or posts.created_at < now() - interval '7 days'
         ), 0), 0
     ), 100) >= 80
order by win_pct desc, graded_picks desc;

-- Run as the querying user, not the view owner, so the view can never
-- read past RLS on profiles or posts.
alter view leaderboard set (security_invoker = on);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table follows enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;

-- Profiles: anyone can read (except banned users hidden client-side),
-- only the owner can update their own row.
create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users can update own profile" on profiles for update using (auth.uid() = id);
-- ...but only these columns. Without this a user could PATCH their own
-- row to set is_admin = true. RLS can't scope columns; grants can.
revoke update on profiles from authenticated;
revoke update on profiles from anon;
grant update (username, display_name, bio, avatar_url) on profiles to authenticated;
create policy "users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Follows: readable by all, writable only by the follower.
create policy "follows are publicly readable" on follows for select using (true);
create policy "users manage own follows" on follows for insert with check (auth.uid() = follower_id);
create policy "users remove own follows" on follows for delete using (auth.uid() = follower_id);

-- Posts: readable by all, only the author can insert/update/delete their own.
create policy "posts are publicly readable" on posts for select using (true);
create policy "users insert own posts" on posts for insert with check (auth.uid() = author_id);
create policy "users update own posts" on posts for update using (auth.uid() = author_id);
-- ...but only the result may change. A pick's terms (odds, stake, tag,
-- bet_type, caption) are immutable once posted, or the record would be
-- worthless. RLS can't scope columns; column-level grants can.
revoke update on posts from authenticated;
revoke update on posts from anon;
grant update (status, profit) on posts to authenticated;
create policy "users delete own posts" on posts for delete using (auth.uid() = author_id);

-- Likes
create policy "likes are publicly readable" on likes for select using (true);
create policy "users manage own likes" on likes for insert with check (auth.uid() = user_id);
create policy "users update own likes" on likes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users remove own likes" on likes for delete using (auth.uid() = user_id);

-- Comments
create policy "comments are publicly readable" on comments for select using (true);
create policy "users insert own comments" on comments for insert with check (auth.uid() = author_id);
create policy "users delete own comments" on comments for delete using (auth.uid() = author_id);

-- Reports: only reporter can read/insert their own reports; admins handled via service role in admin panel.
create policy "users insert reports" on reports for insert with check (auth.uid() = reporter_id);
create policy "users view own reports" on reports for select using (auth.uid() = reporter_id);

-- Blocks: only the blocker can see/manage their block list.
create policy "users manage own blocks" on blocks for all using (auth.uid() = blocker_id);

-- ============================================================
-- Admin moderation (feature 13) is done with the Supabase
-- service_role key from a protected /admin route (see app/admin) —
-- service_role bypasses RLS, so all admin actions go through
-- server-side API routes that check profiles.is_admin first.
-- ============================================================
