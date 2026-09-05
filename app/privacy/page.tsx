import Link from 'next/link'
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/lib/brand'

export const metadata = {
  title: 'Privacy',
  description: `What ${SITE_NAME} collects, why, and who else sees it.`,
}

/**
 * Written from what the code actually does, not from a template.
 *
 * Every third party listed here is one the site genuinely loads or
 * writes to, and the two rooms that stay out of analytics are named
 * because Clarity.tsx and RedditPixel.tsx really do exclude them. A
 * policy that describes a different site than the one running is worse
 * than none: it's a promise nobody checked.
 */
export default function PrivacyPage() {
  return (
    <div className="legal">
      <h1 className="page-title">Privacy</h1>
      <p className="legal-sub">
        Last updated 5 September 2026. Plain version: we keep what the site
        needs to work, we don&apos;t sell anything, and we don&apos;t send your
        email address to advertisers.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Email address and password, handled by
          our authentication provider — we never see the password. Plus the
          username, display name, bio, picture and leagues you choose.
        </li>
        <li>
          <strong>What you post.</strong> Picks, takes, comments, reactions,
          follows and watchlist. Picks and takes are public by design: a record
          nobody can see isn&apos;t a record.
        </li>
        <li>
          <strong>Private messages</strong>, the Vent room, and game chat. These
          are visible to the people in them and to us as site administrators for
          moderation. They are not public.
        </li>
        <li>
          <strong>Sign-in attempts.</strong> A username and a timestamp, kept
          about an hour, so somebody can&apos;t guess passwords endlessly.
        </li>
        <li>
          <strong>Basic analytics.</strong> Pages visited, roughly where from,
          and what kind of device. No name attached.
        </li>
      </ul>

      <h2>Who else sees it</h2>
      <ul>
        <li><strong>Supabase</strong> — database, sign-in and file storage.</li>
        <li><strong>Vercel</strong> — hosting and page analytics.</li>
        <li><strong>Resend</strong> — sends confirmation and password emails.</li>
        <li><strong>Microsoft Clarity</strong> — how pages are used, so layout problems are visible.</li>
        <li><strong>Reddit</strong> — a pixel telling us which ads led to sign-ups.</li>
      </ul>
      <p>
        <strong>The Vent room, private messages and password resets are excluded
        from Clarity and from the Reddit pixel.</strong> Those pages are not
        recorded and not reported to anyone. Vent especially: people go there to
        say something in private, and handing an ad network the fact that
        somebody opened it would defeat the point of having the room.
      </p>
      <p>
        Reddit offers a feature that sends advertisers&apos; visitors&apos; email
        addresses back for better ad matching. <strong>It is switched off.</strong>{' '}
        Your email is for your account and for emails you asked for.
      </p>
      <p>We do not sell your data, and there is no advertising on the site itself.</p>

      <h2>Cookies</h2>
      <p>
        A sign-in cookie so you stay logged in, a note of your light or dark
        preference, and cookies set by the analytics above. Blocking the
        analytics ones costs you nothing here.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or clear your username, picture, bio and leagues any time from your profile.</li>
        <li>Delete your own posts before the game starts. After it starts they stay, because a record you can edit afterwards isn&apos;t one.</li>
        <li>
          <strong>Ask us to delete your account</strong> and we will remove it and
          the personal data attached to it. Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}>{SUPPORT_EMAIL}</a>{' '}
          from the address on the account. There is no self-serve button for this
          yet, which is why the email is here.
        </li>
        <li>Ask for a copy of what we hold on you, at the same address.</li>
      </ul>

      <h2>Keeping it</h2>
      <p>
        Account data stays until you ask us to delete it. Sign-in attempts are
        cleared within about an hour. Posts stay while the account does.
      </p>

      <h2>Age</h2>
      <p>
        {SITE_NAME} is for people 18 and over. Nothing here is gambling — no
        deposits, no stakes, no payouts — but the sport being discussed is
        wagered on elsewhere, so we keep the site to adults.
      </p>

      <h2>Changes</h2>
      <p>
        If this changes materially we&apos;ll say so on the site rather than
        quietly editing the date at the top.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=Privacy`}>{SUPPORT_EMAIL}</a>{' '}
        — a person reads it.
      </p>

      <p className="legal-foot">
        <Link href="/help">How {SITE_NAME} works</Link>
        {' · '}
        <a href={SITE_URL}>{SITE_URL.replace('https://', '')}</a>
      </p>
    </div>
  )
}
