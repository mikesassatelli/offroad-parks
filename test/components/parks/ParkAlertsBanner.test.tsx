import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  ParkAlertsBanner,
  ALERT_DISMISS_KEY_PREFIX,
  type ParkAlertDisplay,
} from "@/components/parks/ParkAlertsBanner";

// jsdom's built-in localStorage is stubbed out in this config (the env ships
// with --localstorage-file misconfigured), so we install a lightweight shim
// scoped to this file.
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

function makeAlert(overrides: Partial<ParkAlertDisplay> = {}): ParkAlertDisplay {
  return {
    id: "alert-1",
    title: "Main gate closed",
    body: "Use the north gate instead.",
    severity: "WARNING",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ParkAlertsBanner", () => {
  beforeEach(() => {
    // Remove only the keys we set so we don't trip on jsdom's stubbed
    // localStorage.clear implementation.
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(ALERT_DISMISS_KEY_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // ignore
    }
  });

  it("renders nothing when no alerts are provided", () => {
    const { container } = render(<ParkAlertsBanner alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders alert title, body, and dismiss button", () => {
    render(<ParkAlertsBanner alerts={[makeAlert()]} />);
    expect(screen.getByText("Main gate closed")).toBeInTheDocument();
    expect(screen.getByText("Use the north gate instead.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dismiss alert/i })).toBeInTheDocument();
  });

  it("hides the alert after the user dismisses it and persists the choice to localStorage", () => {
    const alert = makeAlert({ id: "alert-persist" });
    render(<ParkAlertsBanner alerts={[alert]} />);

    expect(screen.queryByTestId("park-alert-alert-persist")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dismiss alert/i }));

    expect(screen.queryByTestId("park-alert-alert-persist")).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(ALERT_DISMISS_KEY_PREFIX + "alert-persist")
    ).toBe("1");
  });

  it("does not render an alert that was previously dismissed (hydrated from localStorage)", () => {
    window.localStorage.setItem(ALERT_DISMISS_KEY_PREFIX + "already-dismissed", "1");
    render(
      <ParkAlertsBanner
        alerts={[
          makeAlert({ id: "already-dismissed", title: "Old closure" }),
          makeAlert({ id: "still-visible", title: "Live event this weekend" }),
        ]}
      />
    );

    // The previously-dismissed alert is pruned after hydration effect runs.
    expect(screen.queryByText("Old closure")).not.toBeInTheDocument();
    expect(screen.getByText("Live event this weekend")).toBeInTheDocument();
  });

  it("renders multiple alerts at once", () => {
    render(
      <ParkAlertsBanner
        alerts={[
          makeAlert({ id: "a", title: "Alert A", severity: "DANGER" }),
          makeAlert({ id: "b", title: "Alert B", severity: "INFO" }),
        ]}
      />
    );
    expect(screen.getByText("Alert A")).toBeInTheDocument();
    expect(screen.getByText("Alert B")).toBeInTheDocument();
  });
});
