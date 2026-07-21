import { describe, it, expect } from "vitest";
import { parseIowaOhvAlerts } from "@/lib/iowa-ohv/parse";

// Faithful to the live Iowa DNR "ViewOHVAlerts" markup (bordered .p-2 boxes).
const FIXTURE = `
<div class="row">
  <div class="col-12 m-2">
    <div class="p-2" style="border: 3px solid red; border-radius: 10px;">
      <div class="font-weight-bold" style="border-radius: 10px;">
        <div class="d-inline-block" style="font-size: 1.5rem;">
          Nicholson-Ford OHV Park - <span style="font-size: 1.25rem;">Effective: 7/4/2026</span><br />
          <span style="font-size: 1.1rem;">PARK OPEN BUT USE IS LIMITED - Some trails are closed due to tree hazards</span>
        </div>
        <div class="float-right d-inline-block py-1" style="font-size: 1.25rem;">
          Marshall County
        </div>
      </div>
      <div class="pt-1" style="font-size: 1rem;"></div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col-12 m-2">
    <div class="p-2" style="border: 3px solid red; border-radius: 10px;">
      <div class="font-weight-bold" style="border-radius: 10px;">
        <div class="d-inline-block" style="font-size: 1.5rem;">
          Rathbun OHV Park - <span style="font-size: 1.25rem;">Effective: 7/20/2026</span><br />
          <span style="font-size: 1.1rem;">PARK CLOSED - Wet trail conditions</span>
        </div>
        <div class="float-right d-inline-block py-1" style="font-size: 1.25rem;">
          Appanoose County
        </div>
      </div>
      <div class="pt-1" style="font-size: 1rem;"></div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col-12 m-2">
    <div class="p-2" style="border: 3px solid red; border-radius: 10px;">
      <div class="font-weight-bold" style="border-radius: 10px;">
        <div class="d-inline-block" style="font-size: 1.5rem;">
          River Valley OHV Park - <span style="font-size: 1.25rem;">Effective: 3/19/2026</span><br />
          <span style="font-size: 1.1rem;">PARK CLOSED - Major construction project</span>
        </div>
        <div class="float-right d-inline-block py-1" style="font-size: 1.25rem;">
          Pottawattamie County
        </div>
      </div>
      <div class="pt-1" style="font-size: 1rem;">
        The park is currently closed to public use.  This closure alert will be updated with any changes in park status.
      </div>
    </div>
  </div>
</div>
`;

describe("parseIowaOhvAlerts", () => {
  const alerts = parseIowaOhvAlerts(FIXTURE);

  it("parses every alert box", () => {
    expect(alerts).toHaveLength(3);
  });

  it("extracts park name, county, status, reason, and effective date", () => {
    expect(alerts[0]).toMatchObject({
      parkName: "Nicholson-Ford OHV Park",
      county: "Marshall",
      statusLabel: "PARK OPEN BUT USE IS LIMITED",
      reason: "Some trails are closed due to tree hazards",
      effectiveDate: "7/4/2026",
      closed: false,
      limited: true,
    });
  });

  it("flags full closures", () => {
    expect(alerts[1]).toMatchObject({
      parkName: "Rathbun OHV Park",
      county: "Appanoose",
      statusLabel: "PARK CLOSED",
      reason: "Wet trail conditions",
      closed: true,
      limited: false,
    });
  });

  it("captures the extended description block", () => {
    expect(alerts[2].parkName).toBe("River Valley OHV Park");
    expect(alerts[2].extraBody).toContain("currently closed to public use");
    expect(alerts[2].closed).toBe(true);
  });

  it("returns no alerts for an empty page", () => {
    expect(parseIowaOhvAlerts("<html><body></body></html>")).toEqual([]);
  });
});
