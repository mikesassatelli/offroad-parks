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

describe("ContributeCard", () => {
  const noop = () => {};

  it("renders the 'Help keep this listing accurate' title", () => {
    render(
      <ContributeCard parkSlug="test-park" parkName="Test Park" onAddPhotos={noop} />,
    );

    expect(
      screen.getByText(/help keep this listing accurate/i),
    ).toBeInTheDocument();
  });

  it("mounts the correction dialog with the park slug and name", () => {
    render(
      <ContributeCard parkSlug="test-park" parkName="Test Park" onAddPhotos={noop} />,
    );

    const dialog = screen.getByTestId("suggest-correction-dialog");
    expect(dialog).toHaveTextContent("correction:test-park:Test Park");
  });

  it("renders an 'Add photos' button that calls onAddPhotos when clicked", async () => {
    const onAddPhotos = vi.fn();
    const user = userEvent.setup();
    render(
      <ContributeCard
        parkSlug="test-park"
        parkName="Test Park"
        onAddPhotos={onAddPhotos}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add photos/i }));

    expect(onAddPhotos).toHaveBeenCalledOnce();
  });

  it("renders a subtle claim pointer linking to the #claim anchor", () => {
    render(
      <ContributeCard parkSlug="test-park" parkName="Test Park" onAddPhotos={noop} />,
    );

    expect(screen.getByText(/own or manage this park/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /claim it/i });
    expect(link).toHaveAttribute("href", "#claim");
  });
});
