import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  WelcomeProvider,
  useWelcome,
} from "@/components/welcome/WelcomeProvider";

const STORAGE_KEY = "op-welcome-seen";
const TITLE = "Welcome to Offroad Parks";

// jsdom's built-in localStorage is stubbed out in this config (the env ships
// with --localstorage-file misconfigured), so we install a lightweight shim
// scoped to this file — same pattern as ParkAlertsBanner.test.tsx.
beforeAll(() => {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: shim,
  });
});

/** Test consumer that reopens the dialog via the context (the footer link). */
function ReopenButton() {
  const { openWelcome } = useWelcome();
  return <button onClick={openWelcome}>reopen</button>;
}

describe("WelcomeProvider", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("auto-opens for a first-time visitor", async () => {
    render(
      <WelcomeProvider>
        <div>page</div>
      </WelcomeProvider>,
    );

    expect(await screen.findByText(TITLE)).toBeInTheDocument();
  });

  // Regression: on a first visit the dialog's open state is driven purely by
  // the localStorage-derived auto-open, so a bare setState(false) on close was
  // a no-op React bailed out of, leaving the dialog stuck open in prod.
  it("dismisses when 'Start exploring' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WelcomeProvider>
        <div>page</div>
      </WelcomeProvider>,
    );

    await user.click(await screen.findByText("Start exploring"));

    await waitFor(() =>
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("dismisses when the X close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WelcomeProvider>
        <div>page</div>
      </WelcomeProvider>,
    );

    await screen.findByText(TITLE);
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() =>
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument(),
    );
  });

  it("does not auto-open once the visitor has seen it", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    render(
      <WelcomeProvider>
        <div>page</div>
      </WelcomeProvider>,
    );

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("can be reopened via useWelcome after being dismissed", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, "1"); // returning visitor: no auto-open
    render(
      <WelcomeProvider>
        <ReopenButton />
      </WelcomeProvider>,
    );

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

    await user.click(screen.getByText("reopen"));
    expect(await screen.findByText(TITLE)).toBeInTheDocument();

    await user.click(screen.getByText("Start exploring"));
    await waitFor(() =>
      expect(screen.queryByText(TITLE)).not.toBeInTheDocument(),
    );
  });
});
