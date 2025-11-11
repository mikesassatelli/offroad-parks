import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteListItem } from "@/features/route-planner/components/RouteListItem";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("RouteListItem", () => {
  const mockPark: Park = {
    id: "park-1",
    name: "Test Park",
    state: "California",
    city: "Los Angeles",
    coords: { lat: 34.0522, lng: -118.2437 },
    utvAllowed: true,
    terrain: [],
    amenities: [],
    difficulty: [],
  };

  const defaultProps = {
    park: mockPark,
    index: 0,
    isDragging: false,
    isDragOver: false,
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnd: vi.fn(),
    onDragLeave: vi.fn(),
    onRemovePark: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render park name", () => {
    render(<RouteListItem {...defaultProps} />);

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should render park location with city and state", () => {
    render(<RouteListItem {...defaultProps} />);

    expect(screen.getByText("Los Angeles, California")).toBeInTheDocument();
  });

  it("should render park location without city when not provided", () => {
    const parkWithoutCity = { ...mockPark, city: undefined };

    render(<RouteListItem {...defaultProps} park={parkWithoutCity} />);

    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("should display route index number (1-based)", () => {
    render(<RouteListItem {...defaultProps} index={0} />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should display correct index for second item", () => {
    render(<RouteListItem {...defaultProps} index={1} />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should display correct index for third item", () => {
    render(<RouteListItem {...defaultProps} index={2} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should link to park detail page", () => {
    render(<RouteListItem {...defaultProps} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/parks/park-1");
  });

  it("should call onRemovePark when remove button clicked", async () => {
    const onRemovePark = vi.fn();
    const user = userEvent.setup();

    render(<RouteListItem {...defaultProps} onRemovePark={onRemovePark} />);

    const removeButton = screen.getByRole("button");
    await user.click(removeButton);

    expect(onRemovePark).toHaveBeenCalledWith("park-1");
  });

  it("should call onDragStart when drag starts", () => {
    const onDragStart = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} index={2} onDragStart={onDragStart} />,
    );

    const draggable = container.firstChild as HTMLElement;
    fireEvent.dragStart(draggable);

    expect(onDragStart).toHaveBeenCalledWith(2);
  });

  it("should call onDragOver when dragged over", () => {
    const onDragOver = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} index={1} onDragOver={onDragOver} />,
    );

    const draggable = container.firstChild as HTMLElement;
    const event = new Event("dragover", { bubbles: true });
    fireEvent(draggable, event);

    expect(onDragOver).toHaveBeenCalled();
  });

  it("should call onDragEnd when drag ends", () => {
    const onDragEnd = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} onDragEnd={onDragEnd} />,
    );

    const draggable = container.firstChild as HTMLElement;
    fireEvent.dragEnd(draggable);

    expect(onDragEnd).toHaveBeenCalled();
  });

  it("should call onDragLeave when drag leaves", () => {
    const onDragLeave = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} onDragLeave={onDragLeave} />,
    );

    const draggable = container.firstChild as HTMLElement;
    fireEvent.dragLeave(draggable);

    expect(onDragLeave).toHaveBeenCalled();
  });

  it("should apply dragging opacity when isDragging is true", () => {
    const { container } = render(
      <RouteListItem {...defaultProps} isDragging={true} />,
    );

    const draggable = container.firstChild as HTMLElement;
    expect(draggable.className).toContain("opacity-50");
  });

  it("should not apply dragging opacity when isDragging is false", () => {
    const { container } = render(
      <RouteListItem {...defaultProps} isDragging={false} />,
    );

    const draggable = container.firstChild as HTMLElement;
    expect(draggable.className).not.toContain("opacity-50");
  });

  it("should apply drag over border when isDragOver is true", () => {
    const { container } = render(
      <RouteListItem {...defaultProps} isDragOver={true} />,
    );

    const draggable = container.firstChild as HTMLElement;
    expect(draggable.className).toContain("border-blue-500");
  });

  it("should not apply drag over border when isDragOver is false", () => {
    const { container } = render(
      <RouteListItem {...defaultProps} isDragOver={false} />,
    );

    const draggable = container.firstChild as HTMLElement;
    expect(draggable.className).toContain("border-transparent");
  });

  it("should be draggable", () => {
    const { container } = render(<RouteListItem {...defaultProps} />);

    const draggable = container.firstChild as HTMLElement;
    expect(draggable).toHaveAttribute("draggable", "true");
  });

  it("should render grip icon", () => {
    const { container } = render(<RouteListItem {...defaultProps} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should render remove icon", () => {
    const { container } = render(<RouteListItem {...defaultProps} />);

    // Should have both grip icon and X icon
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });
});
