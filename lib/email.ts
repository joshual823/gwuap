import { SITE_NAME, SITE_URL, SUPPORT_EMAIL, BRAND_GREEN, BRAND_INK } from './brand'

/**
 * Sending mail, through Resend.
 *
 * The same account Supabase already uses for confirmation links, so the
 * domain is verified and these land in an inbox rather than a spam
 * folder. Inert without RESEND_API_KEY, which means nothing is sent
 * locally or from a preview by accident.
 *
 * Returns whether it went rather than throwing: the caller is a
 * scheduled job working through a list, and one bad address shouldn't
 * stop the rest.
 */
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <hello@gwuap.co>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: SUPPORT_EMAIL,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `${res.status} ${body.slice(0, 140)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' }
  }
}

/**
 * One shell for every email the site sends.
 *
 * Inline styles and a table-free layout because email clients are not
 * browsers — Gmail strips <style> blocks and Outlook ignores flexbox.
 * Dark background to match the site, but with a light fallback colour
 * set on the text, since a handful of clients drop background colours
 * and would otherwise render white on white.
 */
export function emailShell(opts: { heading: string; body: string; cta?: { label: string; href: string } }): string {
  const button = opts.cta
    ? `<a href="${opts.cta.href}" style="display:inline-block;background:${BRAND_GREEN};color:${BRAND_INK};
         font-weight:700;font-size:15px;text-decoration:none;padding:13px 24px;border-radius:999px;
         margin-top:18px">${opts.cta.label}</a>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0B0E11">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;
              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
              color:#ECEDEE;background:#0B0E11">
    <div style="font-size:22px;font-weight:800;color:${BRAND_GREEN};letter-spacing:-0.5px">${SITE_NAME}</div>
    <div style="height:1px;background:#22282F;margin:18px 0 22px"></div>
    <div style="font-size:19px;font-weight:700;color:#ECEDEE;line-height:1.35">${opts.heading}</div>
    <div style="font-size:15px;line-height:1.6;color:#A3AEB9;margin-top:12px">${opts.body}</div>
    ${button}
    <div style="height:1px;background:#22282F;margin:26px 0 16px"></div>
    <div style="font-size:12px;line-height:1.6;color:#7A838F">
      You're getting this because you have an account on
      <a href="${SITE_URL}" style="color:#7A838F">${SITE_URL.replace('https://', '')}</a>.
      Turn these off any time under Edit profile.
    </div>
  </div>
</body></html>`
}
