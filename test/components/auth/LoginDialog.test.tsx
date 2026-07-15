import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signIn } from "next-auth/react";
import { LoginDialog } from "@/components/auth/LoginDialog";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

const signInMock = vi.mocked(signIn);

describe("LoginDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInMock.mockResolvedValue({ ok: true } as never);
  });

  it("renders a Sign In trigger", () => {
    render(<LoginDialog />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("reveals Google and email options when opened", async () => {
    const user = userEvent.setup();
    render(<LoginDialog />);

    await user.click(screen.getByText("Sign In"));

    expect(await screen.findByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("calls Google sign-in with a callback URL", async () => {
    const user = userEvent.setup();
    render(<LoginDialog />);

    await user.click(screen.getByText("Sign In"));
    await user.click(await screen.findByText("Continue with Google"));

    expect(signInMock).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("sends a magic link via the resend provider and confirms", async () => {
    const user = userEvent.setup();
    render(<LoginDialog />);

    await user.click(screen.getByText("Sign In"));
    await user.type(
      await screen.findByPlaceholderText("you@example.com"),
      "rider@example.com",
    );
    await user.click(screen.getByText(/Email me a sign-in link/));

    expect(signInMock).toHaveBeenCalledWith("resend", {
      email: "rider@example.com",
      redirect: false,
      callbackUrl: "/",
    });
    expect(await screen.findByText("Check your email")).toBeInTheDocument();
  });

  it("shows an error when the magic-link request fails", async () => {
    signInMock.mockResolvedValue({ error: "EmailSignInError" } as never);
    const user = userEvent.setup();
    render(<LoginDialog />);

    await user.click(screen.getByText("Sign In"));
    await user.type(
      await screen.findByPlaceholderText("you@example.com"),
      "rider@example.com",
    );
    await user.click(screen.getByText(/Email me a sign-in link/));

    await waitFor(() =>
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument(),
    );
  });
});
