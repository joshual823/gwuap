# Supabase email templates

Paste these into **Authentication → Emails** in the Supabase dashboard.
They're kept here because dashboard config is easy to lose and has no
version history.

| File | Supabase template | Suggested subject |
|---|---|---|
| `reset-password.html` | Reset Password | Reset your Gwuap password |
| `confirm-signup.html` | Confirm signup | Confirm your email for Gwuap |
| `change-email.html` | Change Email Address | Confirm your new email for Gwuap |

## Why they look the way they do

Supabase's defaults are one sentence and a bare link on a white page —
structurally identical to a phishing email. These fix the things that
filters and people both read as suspicious:

- **The plain URL is shown as text under the button.** Hiding a
  destination behind "click here" is a phishing tell; showing it is
  reassuring and works when a client strips the button.
- **The recipient's own address appears in the body.** Real transactional
  mail knows who it's writing to.
- **There's an explicit "if this wasn't you" line.** Every legitimate
  security email has one.
- **Nothing is loaded from an external server** — no images, no fonts, no
  tracking pixel. Remote content in a first email from an unknown domain
  is a deliverability penalty, and images are blocked by default anyway.
- **Table layout with inline styles.** Email clients don't reliably
  support flexbox, grid, or `<style>` blocks.
- **Hidden preheader text** controls the preview line in the inbox list
  instead of leaking the first stray words of markup.

None of this moves you out of spam on its own — that's domain reputation,
which only time and consistent sending fix. It helps at the margin, and
it makes the mail trustworthy once someone finds it.
