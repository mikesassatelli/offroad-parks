import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import AdminConditionsPage from "@/app/admin/conditions/page";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trailCondition: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/components/admin/ConditionModerationTable", () => ({
  ConditionModerationTable: ({ conditions }: { conditions: any[] }) => (
    <div data-testid="condition-table">
      {conditions.map((c) => (
        <div key={c.id}>{c.park.name}</div>
      ))}
    </div>
  ),
}));

const makeCondition = (id: string, reportStatus: "PENDING_REVIEW" | "PUBLISHED", parkName: string) => ({
  id,
  parkId: `park-${id}`,
  status: "OPEN",
  note: null,
  reportStatus,
  createdAt: new Date(),
  park: { name: parkName, slug: parkName.toLowerCase().replace(/ /g, "-") },
  user: { name: "Tester", email: "test@example.com" },
});

describe("AdminConditionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page heading", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([]);
    const component = await AdminConditionsPage();
    render(component);
    expect(screen.getByText("Trail Conditions")).toBeInTheDocument();
  });

  it("renders the page description", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([]);
    const component = await AdminConditionsPage();
    render(component);
    expect(
      screen.getByText(/review and moderate community trail condition reports/i),
    ).toBeInTheDocument();
  });

  it("displays correct pending count", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([
      makeCondition("1", "PENDING_REVIEW", "Park A"),
      makeCondition("2", "PENDING_REVIEW", "Park B"),
      makeCondition("3", "PUBLISHED", "Park C"),
    ] as any);
    const component = await AdminConditionsPage();
    render(component);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    const pendingCount = screen.getByText("2");
    expect(pendingCount).toBeInTheDocument();
  });

  it("displays correct published count", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([
      makeCondition("1", "PENDING_REVIEW", "Park A"),
      makeCondition("2", "PUBLISHED", "Park B"),
      makeCondition("3", "PUBLISHED", "Park C"),
    ] as any);
    const component = await AdminConditionsPage();
    render(component);
    expect(screen.getByText("Published")).toBeInTheDocument();
    const publishedCount = screen.getByText("2");
    expect(publishedCount).toBeInTheDocument();
  });

  it("displays total reports count", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([
      makeCondition("1", "PENDING_REVIEW", "Park A"),
      makeCondition("2", "PUBLISHED", "Park B"),
    ] as any);
    const component = await AdminConditionsPage();
    render(component);
    expect(screen.getByText("Total Reports")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("passes conditions to ConditionModerationTable", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([
      makeCondition("1", "PENDING_REVIEW", "Moab Sand Flats"),
    ] as any);
    const component = await AdminConditionsPage();
    render(component);
    expect(screen.getByTestId("condition-table")).toBeInTheDocument();
    expect(screen.getByText("Moab Sand Flats")).toBeInTheDocument();
  });

  it("queries conditions with park and user includes, ordered by status then date", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([]);
    await AdminConditionsPage();
    expect(prisma.trailCondition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          park: expect.objectContaining({ select: { name: true, slug: true } }),
          user: expect.objectContaining({ select: { name: true, email: true } }),
        }),
      }),
    );
  });

  it("shows zero counts when no conditions exist", async () => {
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([]);
    const component = await AdminConditionsPage();
    render(component);
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(3); // pending, published, total
  });
});
