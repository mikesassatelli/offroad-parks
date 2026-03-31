import { render, screen } from "@testing-library/react";
import OperatorIndexPage from "@/app/operator/page";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorUser: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockMembership = {
  role: "OWNER",
  operator: {
    id: "op-1",
    name: "Desert Riders LLC",
    parks: [
      {
        id: "park-1",
        name: "Desert Riders Park",
        slug: "desert-riders-park",
        address: { city: "Moab", state: "UT" },
      },
    ],
  },
};

describe("OperatorIndexPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to sign in when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(OperatorIndexPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/api/auth/signin");
  });

  it("renders empty state when user manages no parks", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.operatorUser.findMany).mockResolvedValue([]);

    const component = await OperatorIndexPage();
    render(component);

    expect(screen.getByText("No parks yet")).toBeInTheDocument();
    expect(
      screen.getByText(/You don't manage any parks yet/)
    ).toBeInTheDocument();
  });

  it("renders a card for each managed park", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.operatorUser.findMany).mockResolvedValue([
      mockMembership,
    ] as any);

    const component = await OperatorIndexPage();
    render(component);

    expect(screen.getByText("Desert Riders Park")).toBeInTheDocument();
    expect(screen.getByText(/Desert Riders LLC/)).toBeInTheDocument();
    expect(screen.getByText(/owner/i)).toBeInTheDocument();
  });

  it("links each park card to its operator dashboard", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.operatorUser.findMany).mockResolvedValue([
      mockMembership,
    ] as any);

    const component = await OperatorIndexPage();
    const { container } = render(component);

    const link = container.querySelector(
      'a[href="/operator/desert-riders-park/dashboard"]'
    );
    expect(link).toBeInTheDocument();
  });

  it("renders multiple parks across multiple memberships", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.operatorUser.findMany).mockResolvedValue([
      mockMembership,
      {
        role: "MEMBER",
        operator: {
          id: "op-2",
          name: "Pine Ridge OHV",
          parks: [
            {
              id: "park-2",
              name: "Pine Ridge Park",
              slug: "pine-ridge-park",
              address: { city: "Flagstaff", state: "AZ" },
            },
          ],
        },
      },
    ] as any);

    const component = await OperatorIndexPage();
    render(component);

    expect(screen.getByText("Desert Riders Park")).toBeInTheDocument();
    expect(screen.getByText("Pine Ridge Park")).toBeInTheDocument();
  });

  it("displays city and state from park address", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.operatorUser.findMany).mockResolvedValue([
      mockMembership,
    ] as any);

    const component = await OperatorIndexPage();
    render(component);

    expect(screen.getByText(/Moab, UT/)).toBeInTheDocument();
  });

  it("queries operatorUser with correct userId", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-42" },
    } as any);
    vi.mocked(prisma.operatorUser.findMany).mockResolvedValue([]);

    await OperatorIndexPage();

    expect(prisma.operatorUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-42" },
      })
    );
  });
});
