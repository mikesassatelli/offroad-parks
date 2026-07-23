import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  UserManagementTable,
  type ManagedUser,
} from "@/components/admin/UserManagementTable";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Renders as a desktop table + a mobile card list (jsdom applies no CSS, so both
// are present). Scope role/badge assertions to the desktop table.
const inTable = () => within(screen.getByRole("table"));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const baseUsers: ManagedUser[] = [
  {
    id: "u1",
    name: "Alice",
    email: "alice@example.com",
    role: "USER",
    submittedParkCount: 2,
    createdAt: "2024-06-01T00:00:00.000Z",
  },
  {
    id: "u2",
    name: "Bob",
    email: "bob@example.com",
    role: "ADMIN",
    submittedParkCount: 5,
    createdAt: "2024-07-01T00:00:00.000Z",
  },
  {
    id: "super-1",
    name: "Mike",
    email: "mike.sassatelli@gmail.com",
    role: "SUPER_ADMIN",
    submittedParkCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  global.fetch = mockFetch as unknown as typeof fetch;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UserManagementTable", () => {
  it("renders read-only role badges when canEditRoles is false", () => {
    render(
      <UserManagementTable
        users={baseUsers}
        currentUserId="someone-else"
        canEditRoles={false}
      />,
    );

    expect(inTable().getByText("USER")).toBeInTheDocument();
    expect(inTable().getByText("ADMIN")).toBeInTheDocument();
    expect(inTable().getByText("SUPER_ADMIN")).toBeInTheDocument();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("renders a role select per user when canEditRoles is true", () => {
    render(
      <UserManagementTable
        users={baseUsers}
        currentUserId="super-1"
        canEditRoles={true}
      />,
    );

    expect(inTable().getAllByRole("combobox")).toHaveLength(3);
  });

  it("disables non-SUPER_ADMIN options for the current viewer (no self-demote)", () => {
    render(
      <UserManagementTable
        users={baseUsers}
        currentUserId="super-1"
        canEditRoles={true}
      />,
    );

    const ownSelect = inTable().getByLabelText(
      "Role for mike.sassatelli@gmail.com",
    ) as HTMLSelectElement;
    const options = Array.from(ownSelect.querySelectorAll("option"));
    expect(options.find((o) => o.value === "USER")?.disabled).toBe(true);
    expect(options.find((o) => o.value === "ADMIN")?.disabled).toBe(true);
    expect(options.find((o) => o.value === "OPERATOR")?.disabled).toBe(true);
    expect(options.find((o) => o.value === "SUPER_ADMIN")?.disabled).toBe(false);
  });

  it("PATCHes the role API and refreshes on success", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(
      <UserManagementTable
        users={baseUsers}
        currentUserId="super-1"
        canEditRoles={true}
      />,
    );

    const aliceSelect = inTable().getByLabelText("Role for alice@example.com");
    await user.selectOptions(aliceSelect, "ADMIN");

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/users/u1/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("shows the API error when the request fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Super admins cannot demote themselves" }),
    });
    const user = userEvent.setup();

    render(
      <UserManagementTable
        users={baseUsers}
        currentUserId="super-1"
        canEditRoles={true}
      />,
    );

    const bobSelect = inTable().getByLabelText("Role for bob@example.com");
    await user.selectOptions(bobSelect, "USER");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /super admins cannot demote/i,
      ),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
