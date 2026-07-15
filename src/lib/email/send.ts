import { Resend } from "resend";

/**
 * Shared transactional email sender (OP-96).
 *
 * When `RESEND_API_KEY` is set, mail is sent via Resend. When it is not — in
 * local dev, CI, or preview environments without a key — we fall back to
 * logging the message to the server console instead of sending. This keeps
 * development and tests free of a live key and prevents accidental real sends.
 *
 * Every feature that needs to email a user (magic-link login, claim/welcome
 * emails, notifications) should go through `sendEmail` so there is exactly one
 * provider integration and one dev fallback.
 */

const apiKey = process.env.RESEND_API_KEY;

/** From address for all outbound mail. Override per environment via env. */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Offroad Parks <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

/** True when a real provider is configured (i.e. not the dev fallback). */
export const emailEnabled = resend !== null;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative. Strongly recommended for deliverability. */
  text?: string;
}

export interface SendEmailResult {
  /** Provider message id, or null when the dev fallback handled it. */
  id: string | null;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    // Dev fallback — no provider configured. Log instead of sending.
    console.info(
      [
        "[email:dev] (no RESEND_API_KEY — logging instead of sending)",
        `  to:      ${Array.isArray(to) ? to.join(", ") : to}`,
        `  subject: ${subject}`,
        text ? `  text:    ${text}` : `  html:    ${html}`,
      ].join("\n"),
    );
    return { id: null };
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    // Resend's typings want text when html is present in some overloads;
    // fall back to a stripped version so we always send a text part.
    text:
      text ??
      html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  return { id: data?.id ?? null };
}
