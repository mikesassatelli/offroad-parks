import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ContributeCard } from "@/features/parks/detail/components/ContributeCard";

// Stub the correction dialog — we only care that ContributeCard mounts it with
// the right props, not its internals.
vi.mock(
  "@/features/parks/detail/components/SuggestCorrectionDialog",
  () => ({
    SuggestCorrectionDialog: ({ parkSlug, parkName }: any) => (
      <div data-testid="suggest-correction-dialog">
        correction:{parkSlug}:{parkName}
      </div>
    ),
  }),
);

// Stub the claim flow — we assert it's embedded inside the card with the right
// props, not its internal states (those are covered in ParkClaimCTA's tests).
vi.mock("@/features/parks/detail/components/ParkClaimCTA", () => ({
  ParkClaimCTA: (props: any) => (
    <div
      data-testid="claim-cta"
      data-embedded={String(props.embedded)}
      data-slug={props.parkSlug}
      data-loggedin={String(props.isLoggedIn)}
      data-operatorname={props.operatorName ?? ""}
    >
      claim
    </div>
  ),
}));

describe("ContributeCard", () => {
  const defaultProps = {
    parkSlug: "test-park",
    parkName: "Test Park",
    onAddPhotos: () => {},
    isLoggedIn: true,
  };

  it("renders the 'Help keep this listing accurate' title", () => {
    render(<ContributeCard {...defaultProps} />);

    expect(
      screen.getByText(/help keep this listing accurate/i),
    ).toBeInTheDocument();
  });

  it("mounts the correction dialog with the park slug and name", () => {
    render(<ContributeCard {...defaultProps} />);

    const dialog = screen.getByTestId("suggest-correction-dialog");
    expect(dialog).toHaveTextContent("correction:test-park:Test Park");
  });

  it("renders an 'Add photos' button that calls onAddPhotos when clicked", async () => {
    const onAddPhotos = vi.fn();
    const user = userEvent.setup();
    render(<ContributeCard {...defaultProps} onAddPhotos={onAddPhotos} />);

    await user.click(screen.getByRole("button", { name: /add photos/i }));

    expect(onAddPhotos).toHaveBeenCalledOnce();
  });

  it("embeds the claim flow inside the card (no separate box) with claim props threaded through", () => {
    render(
      <ContributeCard
        {...defaultProps}
        isLoggedIn={false}
        operatorName="Desert Riders"
      />,
    );

    const claim = screen.getByTestId("claim-cta");
    expect(claim).toBeInTheDocument();
    // Rendered inline (embedded), not as a standalone card the user is pointed to.
    expect(claim).toHaveAttribute("data-embedded", "true");
    expect(claim).toHaveAttribute("data-slug", "test-park");
    expect(claim).toHaveAttribute("data-loggedin", "false");
    expect(claim).toHaveAttribute("data-operatorname", "Desert Riders");
    // The old cross-page pointer link is gone.
    expect(screen.queryByRole("link", { name: /claim it/i })).toBeNull();
  });
});
