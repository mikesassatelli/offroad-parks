import { render, screen, waitFor } from "@testing-library/react";
import { act, renderHook } from "@testing-library/react";
import { AlertProvider, useAlerts } from "@/hooks/useAlerts";
import { vi } from "vitest";
import { ReactNode } from "react";

// Mock the AlertContainer component
vi.mock("@/components/ui/Alert", () => ({
  AlertContainer: ({ alerts, onDismiss }: any) => (
    <div data-testid="alert-container">
      {alerts.map((alert: any) => (
        <div key={alert.id} data-testid={`alert-${alert.type}`}>
          <span>{alert.message}</span>
          <button onClick={() => onDismiss(alert.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  ),
}));

describe("useAlerts", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AlertProvider>{children}</AlertProvider>
  );

  it("should throw error when used outside AlertProvider", () => {
    // Suppress console.error for this test
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAlerts());
    }).toThrow("useAlerts must be used within AlertProvider");

    consoleError.mockRestore();
  });

  it("should provide showAlert function", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });

    expect(result.current.showAlert).toBeDefined();
    expect(typeof result.current.showAlert).toBe("function");
  });

  it("should show success alert", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("success", "Operation successful");
    });

    waitFor(() => {
      const successAlert = container.querySelector(
        '[data-testid="alert-success"]',
      );
      expect(successAlert).toBeInTheDocument();
      expect(successAlert).toHaveTextContent("Operation successful");
    });
  });

  it("should show error alert", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("error", "Operation failed");
    });

    waitFor(() => {
      const errorAlert = container.querySelector('[data-testid="alert-error"]');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent("Operation failed");
    });
  });

  it("should show info alert", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("info", "Information message");
    });

    waitFor(() => {
      const infoAlert = container.querySelector('[data-testid="alert-info"]');
      expect(infoAlert).toBeInTheDocument();
      expect(infoAlert).toHaveTextContent("Information message");
    });
  });

  it("should show warning alert", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("warning", "Warning message");
    });

    waitFor(() => {
      const warningAlert = container.querySelector(
        '[data-testid="alert-warning"]',
      );
      expect(warningAlert).toBeInTheDocument();
      expect(warningAlert).toHaveTextContent("Warning message");
    });
  });

  it("should show multiple alerts", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("success", "First message");
      result.current.showAlert("error", "Second message");
      result.current.showAlert("info", "Third message");
    });

    waitFor(() => {
      const alerts = container.querySelectorAll('[data-testid^="alert-"]');
      expect(alerts.length).toBe(3);
    });
  });

  it("should render AlertContainer", () => {
    render(
      <AlertProvider>
        <div>Test Content</div>
      </AlertProvider>,
    );

    expect(screen.getByTestId("alert-container")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render children", () => {
    render(
      <AlertProvider>
        <div data-testid="child-content">Child Component</div>
      </AlertProvider>,
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("should generate unique IDs for alerts", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("info", "Message 1");
      result.current.showAlert("info", "Message 2");
    });

    waitFor(() => {
      const alerts = container.querySelectorAll('[data-testid="alert-info"]');
      expect(alerts.length).toBe(2);
      // Each should have a unique key (not directly testable without React internals)
      expect(alerts[0]).not.toBe(alerts[1]);
    });
  });

  it("should maintain alert order", () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("success", "First");
      result.current.showAlert("error", "Second");
      result.current.showAlert("info", "Third");
    });

    waitFor(() => {
      const alerts = container.querySelectorAll('[data-testid^="alert-"]');
      expect(alerts[0]).toHaveTextContent("First");
      expect(alerts[1]).toHaveTextContent("Second");
      expect(alerts[2]).toHaveTextContent("Third");
    });
  });

  it("should dismiss alert when dismiss button is clicked", async () => {
    const { result } = renderHook(() => useAlerts(), { wrapper });
    const { container } = render(
      <AlertProvider>
        <div />
      </AlertProvider>,
    );

    act(() => {
      result.current.showAlert("success", "Test alert");
    });

    await waitFor(() => {
      expect(screen.getByText("Test alert")).toBeInTheDocument();
    });

    // Click the dismiss button
    const dismissButton = screen.getByText("Dismiss");
    act(() => {
      dismissButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByText("Test alert")).not.toBeInTheDocument();
    });
  });
});
