import { fireEvent, render, screen } from "@testing-library/react";
import { SearchHeader } from "@/components/layout/SearchHeader";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div
      data-testid="select"
      data-value={value}
      onClick={() => onValueChange?.("price")}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
}));

describe("SearchHeader", () => {
  const mockOnSearchQueryChange = vi.fn();
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search input with placeholder", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText("Search by name, city, state…");
    expect(input).toBeInTheDocument();
  });

  it("should render search input with current query", () => {
    render(
      <SearchHeader
        searchQuery="test park"
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText("Search by name, city, state…") as HTMLInputElement;
    expect(input.value).toBe("test park");
  });

  it("should call onSearchQueryChange when search input changes", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    const input = screen.getByPlaceholderText("Search by name, city, state…");
    fireEvent.change(input, { target: { value: "new query" } });

    expect(mockOnSearchQueryChange).toHaveBeenCalledWith("new query");
  });

  it("should render sort dropdown", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("should display current sort option", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="price"
        onSortChange={mockOnSortChange}
      />
    );

    const select = screen.getByTestId("select");
    expect(select).toHaveAttribute("data-value", "price");
  });

  it("should call onSortChange when sort option changes", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    const select = screen.getByTestId("select");
    fireEvent.click(select);

    expect(mockOnSortChange).toHaveBeenCalledWith("price");
  });

  it("should render sort options in select", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText("Name (A–Z)")).toBeInTheDocument();
    expect(screen.getByText("Lowest Day Pass")).toBeInTheDocument();
    expect(screen.getByText("Most Trail Miles")).toBeInTheDocument();
    expect(screen.getByText("Highest Rated")).toBeInTheDocument();
  });

  it("should render filter icon", () => {
    const { container } = render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />
    );

    // Lucide renders as SVG with aria-hidden
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });
});
