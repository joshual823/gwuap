# Reddit — "Meet Gwuap" sports-social signup campaign (12 Sep 2026)

## Creatives

| File | Size | Where it runs |
|---|---|---|
| `gw-field-square.png` | 1080×1080 | primary — mobile feed |
| `gw-field-wide.png` | 1200×628 | desktop feed |
| `gw-meet-square.png` | 1080×1080 | second headline, same ad group, for a read on which line pulls |

Regenerate any of them with `python3 make.py`; the photograph is `field.jpg`.

Licence confirmed clear for use, 12 Sep.

The first version of these drew the field in CSS to sidestep the licence
question entirely. It read as a cartoon, which is what a vector does in a feed
full of photographs — not worth the trade.

Every creative carries the line **"Not a sportsbook. No betting, no money —
nothing at stake but your record."** That is there for the reviewer as much as
the reader. Two campaigns have now been killed on a gambling read; the creative
should answer that question before anyone has to ask it.

## Copy

**Primary (as written, tightened):**

> Meet Gwuap — the new social network for sports fans. Build your own squad,
> keep track of your picks, and talk every game while it's happening. Free to
> join, no card, ever.

Two changes from the original: *"see what's the hype"* → dropped, and *"social
media"* → *"social network"*. The hype line is the one to reconsider on its own
merits — there are 8 accounts on the site, and a Reddit audience is unusually
quick to check a claim like that. "Free to join, no card, ever" is the thing we
can say that nobody else in this category can.

**Variant B (pairs with `gw-meet-square.png`):**

> The group chat for sports, minus the sportsbook. Build a squad, post what you
> think happens, and let the final score settle it. Free to join.

**Destination:** `https://gwuap.co/squads?utm_source=reddit&utm_medium=cpc&utm_campaign=sports-social-sep&utm_content=field-square`

Not `/signup`. Cold traffic dropped into a form converts worse than traffic
dropped onto the page built to explain the thing, and `/squads` leads with
"Sign up free". **This is the first real test of the new front door** — all 25
clicks from the last campaign landed on the old one.

## Objective

**Traffic, not Conversions.** Conversions optimisation needs conversion history
to learn from and the pixel has recorded zero. The last campaign asked for
conversions, got 25 clicks and 0 signups, and never spent its budget. Traffic
will actually deliver, and the question this campaign has to answer — *does the
rebuilt front door convert anybody?* — is answered by the signup count either
way.

## Targeting

### Communities — football-weighted, because the creative is football
r/nfl, r/CFB, r/fantasyfootball, r/DynastyFF, r/NFLstatheads, r/sports

Plus the four biggest team subs for whoever is playing that week, swapped
weekly: r/eagles, r/cowboys, r/49ers, r/steelers (etc.).

### Interests
Sports · American Football · Fantasy Sports

### Phase 2 — only after one campaign clears review and delivers
r/nba, r/CollegeBasketball, r/baseball, r/MLB, r/hockey, r/soccer, r/MMA,
r/boxing, r/tennis, r/formula1, r/NASCAR, r/golf, and their interest
categories — each paired with **its own sport's creative**. A basketball
audience shown a gridiron is a worse match than not reaching them at all.

**Why not all of it now.** At the last campaign's $1.37/click, $20/day buys
about 15 clicks a day. Undivided, that is 100 clicks in a week for ~$137 — a
readable sample. Split across five sport-specific ad groups it is 3 clicks a
day each, needing a month and ~$660 before any one of them means anything.
Five creatives is also five times the review surface on an account that has
already been rejected twice, and five more stock licences to verify. Football
is the largest US sports audience in September anyway; the seasonality is the
same reason the Polymarket ad we are copying is a football field.

### Geo / age
United States, 18+.

### Do NOT add, and this is the whole argument
r/sportsbook · r/sportsbetting · r/DraftKings · r/gambling · r/BettingTips ·
the **Gambling** interest category · sportsbook keyword lists · book and
prediction-market look-alike audiences.

Reddit's rejection email cited **"prohibited targeting methods"**, and the one
gambling-categorised community in the ad group was the only thing the two
rejected ads had in common. X halted a campaign whose creative and handle were
both clean, with the same kind of targeting underneath. The build guide's
conclusion after two controlled tests was that **the creative was never the
thing** — so "target DraftKings users" is a direct request for the one variable
we have evidence gets us rejected, and it would be the account's third policy
rejection, which is the level at which platforms stop rejecting ads and start
restricting accounts.

The copy doesn't need them. "The new social network for sports fans" is aimed at
sports fans, and sports fans are who the clean list reaches. A DraftKings
audience can be tested later as its own ad group, once this account has a
campaign that has actually cleared review and delivered — right now there is
nothing to risk it against.

## Budget and the review date

$20/day. **Read it at 5 days**, or earlier at 100 clicks — roughly four times
the sample the old front door got, and enough to tell 0/100 from 3/100.

## Publishing identity: u/Fanasty823, deliberately

The ad publishes under the personal handle, not a Gwuap-branded one, because
no Gwuap Reddit account exists and a new one may not even be eligible as an
ad publisher until it has some age and karma.

This is a knowing trade, decided 12 Sep: **get five days of real data first,
and spend the account-setup effort only if there is traction worth protecting.**
The X write-up above argues a mismatched handle works against the ad twice —
once at review, once with the stranger reading it — and that argument still
stands. It is being accepted, not refuted. If this campaign clears review and
delivers, the gwuap account becomes the next thing to build.

## What this campaign is actually testing

One thing: **does the rebuilt `/squads` convert cold traffic?** Acquisition has
never been the problem — $86 of Reddit spend and 160 Polymarket members both
arrived and left. 25 clicks → 22 page visits → 0 signups was a verdict on a page
that no longer exists. If the new one goes 0-for-100, the answer is that paid
cold traffic doesn't convert for this product at this stage, and the Polymarket
channel — 2 signups for $0 — is the whole strategy.
