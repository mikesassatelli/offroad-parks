import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `send.ts` reads RESEND_API_KEY and constructs the client at module load, so
// each test controls env + mocks, then dynamically imports a fresh module.
describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock("resend");
  });

  it("uses the dev fallback (logs, no send) when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const { sendEmail, emailEnabled } = await import("@/lib/email/send");

    expect(emailEnabled).toBe(false);
    const result = await sendEmail({
      to: "rider@example.com",
      subject: "Sign in",
      html: "<p>link</p>",
      text: "link",
    });

    expect(result.id).toBeNull();
    expect(info).toHaveBeenCalledOnce();
    expect(info.mock.calls[0][0]).toContain("rider@example.com");
  });

  it("sends via Resend when a key is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_123" }, error: null });
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send };
      },
    }));

    const { sendEmail, emailEnabled } = await import("@/lib/email/send");

    expect(emailEnabled).toBe(true);
    const result = await sendEmail({
      to: "rider@example.com",
      subject: "Sign in",
      html: "<p>link</p>",
      text: "link",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "rider@example.com",
        subject: "Sign in",
        html: "<p>link</p>",
        text: "link",
      }),
    );
    expect(result.id).toBe("email_123");
  });

  it("derives a text part from html when none is given", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const send = vi
      .fn()
      .mockResolvedValue({ data: { id: "email_1" }, error: null });
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send };
      },
    }));

    const { sendEmail } = await import("@/lib/email/send");
    await sendEmail({
      to: "a@b.com",
      subject: "s",
      html: "<p>Hello <strong>world</strong></p>",
    });

    expect(send.mock.calls[0][0].text).toBe("Hello world");
  });

  it("throws when the provider returns an error", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const send = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "rate limited" } });
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send };
      },
    }));

    const { sendEmail } = await import("@/lib/email/send");
    await expect(
      sendEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" }),
    ).rejects.toThrow(/rate limited/);
  });
});
