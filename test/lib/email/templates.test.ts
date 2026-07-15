import { describe, it, expect } from "vitest";
import { renderMagicLinkEmail } from "@/lib/email/templates";

describe("renderMagicLinkEmail", () => {
  const url = "https://offroadparks.com/api/auth/callback/resend?token=abc";
  const host = "offroadparks.com";

  it("produces a sign-in subject", () => {
    const { subject } = renderMagicLinkEmail({ url, host });
    expect(subject).toMatch(/sign in/i);
  });

  it("embeds the magic link in both html and text parts", () => {
    const { html, text } = renderMagicLinkEmail({ url, host });
    expect(html).toContain(url);
    expect(text).toContain(url);
  });

  it("shows the host so the user can confirm where they're signing in", () => {
    const { html, text } = renderMagicLinkEmail({ url, host });
    expect(html).toContain(host);
    expect(text).toContain(host);
  });

  it("renders a full HTML document", () => {
    const { html } = renderMagicLinkEmail({ url, host });
    expect(html).toContain("<!doctype html>");
  });
});
