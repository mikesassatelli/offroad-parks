/**
 * Server-rendered HTML email templates. Kept dependency-free (plain string
 * templates) so they work in any runtime. Each template returns the subject
 * plus html/text parts ready to hand to `sendEmail`.
 */

const BRAND = "Offroad Parks";
const ACCENT = "#ea580c"; // orange-600, matches the app's primary

/** Shared shell: header, content slot, footer. `bodyHtml` is trusted markup. */
function layout(bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #f4f4f5;">
                <span style="font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#18181b;">${BRAND}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#3f3f46;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #f4f4f5;color:#a1a1aa;font-size:12px;line-height:1.5;">
                You received this email because someone entered this address on ${BRAND}. If that wasn't you, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Magic-link sign-in email (OP-97). `url` is the one-time Auth.js callback
 * link; `host` is shown to the user so they can confirm where they're signing
 * in.
 */
export function renderMagicLinkEmail({
  url,
  host,
}: {
  url: string;
  host: string;
}): RenderedEmail {
  const body = `
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Sign in to ${BRAND}</h1>
    <p style="margin:0 0 24px;">Click the button below to sign in to <strong>${host}</strong>. This link expires in 24 hours and can only be used once.</p>
    <p style="margin:0 0 24px;">
      <a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Sign in</a>
    </p>
    <p style="margin:0;color:#71717a;font-size:13px;">Or paste this URL into your browser:<br/><span style="color:#3f3f46;word-break:break-all;">${url}</span></p>
  `;

  return {
    subject: `Sign in to ${BRAND}`,
    html: layout(body),
    text: `Sign in to ${BRAND}\n\nOpen this link to sign in to ${host} (expires in 24 hours, one-time use):\n${url}\n\nIf you didn't request this, you can ignore this email.`,
  };
}
