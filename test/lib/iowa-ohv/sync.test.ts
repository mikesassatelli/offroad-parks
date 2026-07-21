import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  matchPark,
  severityForAlert,
  alertTitle,
  alertBody,
  syncIowaOhvAlerts,
} from "@/lib/iowa-ohv/sync";
import type { IowaOhvAlert } from "@/lib/iowa-ohv/parse";

function makeAlert(overrides: Partial<IowaOhvAlert> = {}): IowaOhvAlert {
  return {
    parkName: "Rathbun OHV Park",
    county: "Appanoose",
    statusLabel: "PARK CLOSED",
    reason: "Wet trail conditions",
    extraBody: "",
    effectiveDate: "7/20/2026",
    closed: true,
    limited: false,
    ...overrides,
  };
}

describe("matchPark", () => {
  const parks = [
    { id: "p-rathbun", name: "Rathbun OHV Park", address: { county: "Appanoose" } },
    {
      id: "p-nf",
      name: "Nicholson-Ford OHV Area",
      address: { county: "Marshall" },
    },
    { id: "p-river", name: "River Valley Park", address: { county: null } },
  ];

  it("matches on significant-token equality, ignoring OHV/Park", () => {
    expect(matchPark(makeAlert(), parks)?.id).toBe("p-rathbun");
  });

  it("matches across name variants (hyphen + Park vs Area)", () => {
    const alert = makeAlert({ parkName: "Nicholson-Ford OHV Park", county: "Marshall" });
    expect(matchPark(alert, parks)?.id).toBe("p-nf");
  });

  it("matches via token containment", () => {
    const alert = makeAlert({ parkName: "River Valley OHV Park", county: "" });
    expect(matchPark(alert, parks)?.id).toBe("p-river");
  });

  it("returns null when nothing matches", () => {
    const alert = makeAlert({ parkName: "Gypsum City OHV Park", county: "Webster" });
    expect(matchPark(alert, parks)).toBeNull();
  });
});

describe("severity / title / body", () => {
  it("maps closures to DANGER and limited use to WARNING", () => {
    expect(severityForAlert(makeAlert({ closed: true }))).toBe("DANGER");
    expect(
      severityForAlert(makeAlert({ closed: false, limited: true }))
    ).toBe("WARNING");
  });

  it("builds a concise title", () => {
    expect(alertTitle(makeAlert({ closed: true }))).toBe("Park Closed");
    expect(
      alertTitle(makeAlert({ closed: false, limited: true }))
    ).toBe("Park Open — Limited Use");
  });

  it("builds a body with reason, effective date, and attribution", () => {
    const body = alertBody(makeAlert());
    expect(body).toContain("Wet trail conditions");
    expect(body).toContain("Effective 7/20/2026.");
    expect(body).toContain("Source: Iowa DNR OHV Alerts.");
  });
});

describe("syncIowaOhvAlerts", () => {
  function makePrisma(opts: {
    parks: Array<{ id: string; name: string; address: { county: string | null } | null }>;
    activeBotAlerts: Array<{
      id: string;
      parkId: string;
      title: string;
      body: string;
      severity: string;
    }>;
  }) {
    return {
      user: { upsert: vi.fn().mockResolvedValue({ id: "bot-user" }) },
      park: { findMany: vi.fn().mockResolvedValue(opts.parks) },
      parkAlert: {
        findMany: vi.fn().mockResolvedValue(opts.activeBotAlerts),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
    };
  }

  const parks = [
    { id: "p-rathbun", name: "Rathbun OHV Park", address: { county: "Appanoose" } },
    { id: "p-nf", name: "Nicholson-Ford OHV Park", address: { county: "Marshall" } },
  ];

  beforeEach(() => vi.clearAllMocks());

  it("creates alerts for newly-closed parks and reports unmatched ones", async () => {
    const prisma = makePrisma({ parks, activeBotAlerts: [] });
    const fetcher = vi.fn().mockResolvedValue([
      makeAlert({ parkName: "Rathbun OHV Park", county: "Appanoose" }),
      makeAlert({ parkName: "Ghost OHV Park", county: "Nowhere" }),
    ]);

    const summary = await syncIowaOhvAlerts({ prisma: prisma as never, fetcher });

    expect(summary.scraped).toBe(2);
    expect(summary.matched).toBe(1);
    expect(summary.created).toBe(1);
    expect(summary.unmatched).toEqual(["Ghost OHV Park"]);
    expect(prisma.parkAlert.create).toHaveBeenCalledOnce();
    expect(prisma.parkAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parkId: "p-rathbun",
          userId: "bot-user",
          severity: "DANGER",
          isActive: true,
        }),
      })
    );
  });

  it("is a no-op when the existing alert is already current", async () => {
    const alert = makeAlert({ parkName: "Rathbun OHV Park" });
    const prisma = makePrisma({
      parks,
      activeBotAlerts: [
        {
          id: "a1",
          parkId: "p-rathbun",
          title: alertTitle(alert),
          body: alertBody(alert),
          severity: severityForAlert(alert),
        },
      ],
    });
    const fetcher = vi.fn().mockResolvedValue([alert]);

    const summary = await syncIowaOhvAlerts({ prisma: prisma as never, fetcher });

    expect(summary.unchanged).toBe(1);
    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(0);
    expect(prisma.parkAlert.create).not.toHaveBeenCalled();
    expect(prisma.parkAlert.update).not.toHaveBeenCalled();
  });

  it("updates an alert whose text changed", async () => {
    const prisma = makePrisma({
      parks,
      activeBotAlerts: [
        {
          id: "a1",
          parkId: "p-rathbun",
          title: "Park Closed",
          body: "stale body",
          severity: "DANGER",
        },
      ],
    });
    const fetcher = vi
      .fn()
      .mockResolvedValue([makeAlert({ parkName: "Rathbun OHV Park" })]);

    const summary = await syncIowaOhvAlerts({ prisma: prisma as never, fetcher });

    expect(summary.updated).toBe(1);
    expect(prisma.parkAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "a1" } })
    );
  });

  it("deactivates alerts for parks that dropped off the page (reopened)", async () => {
    const prisma = makePrisma({
      parks,
      activeBotAlerts: [
        {
          id: "a-old",
          parkId: "p-nf",
          title: "Park Closed",
          body: "old",
          severity: "DANGER",
        },
      ],
    });
    // DNR page now only lists Rathbun; Nicholson-Ford reopened.
    const fetcher = vi
      .fn()
      .mockResolvedValue([makeAlert({ parkName: "Rathbun OHV Park" })]);

    const summary = await syncIowaOhvAlerts({ prisma: prisma as never, fetcher });

    expect(summary.created).toBe(1);
    expect(summary.deactivated).toBe(1);
    expect(prisma.parkAlert.update).toHaveBeenCalledWith({
      where: { id: "a-old" },
      data: { isActive: false },
    });
  });
});
