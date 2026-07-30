import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchHeader } from "@/components/layout/SearchHeader";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, className, ...rest }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, title }: any) => (
    <button onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
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
  SelectTrigger: ({ children, className, ...rest }: any) => (
    <div className={className} {...rest}>
      {children}
    </div>
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
    expect(screen.getByText("Most Reviewed")).toBeInTheDocument();
  });

  it("should render Nearest First sort option", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />,
    );

    expect(screen.getByText("Nearest First")).toBeInTheDocument();
  });

  it("should render Newest sort option", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />,
    );

    expect(screen.getByText("Newest")).toBeInTheDocument();
  });

  it("should render the manual location input", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
      />,
    );

    expect(screen.getByLabelText("Search by location")).toBeInTheDocument();
  });

  it("should call onLocationSearch with the trimmed query on submit", () => {
    const mockOnLocationSearch = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        onLocationSearch={mockOnLocationSearch}
      />,
    );

    const input = screen.getByLabelText("Search by location");
    fireEvent.change(input, { target: { value: "  Denver, CO  " } });
    fireEvent.submit(input.closest("form")!);

    expect(mockOnLocationSearch).toHaveBeenCalledWith("Denver, CO");
  });

  it("should not call onLocationSearch when the query is blank", () => {
    const mockOnLocationSearch = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        onLocationSearch={mockOnLocationSearch}
      />,
    );

    const input = screen.getByLabelText("Search by location");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);

    expect(mockOnLocationSearch).not.toHaveBeenCalled();
  });

  it("should show the radius select only when a location is active", () => {
    const { rerender } = render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="distance-nearest"
        onSortChange={mockOnSortChange}
        locationActive={false}
      />,
    );

    expect(screen.queryByLabelText("Distance radius")).not.toBeInTheDocument();

    rerender(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="distance-nearest"
        onSortChange={mockOnSortChange}
        locationActive={true}
        radiusMiles={50}
        onRadiusChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Distance radius")).toBeInTheDocument();
    expect(screen.getByText("25 mi")).toBeInTheDocument();
    expect(screen.getByText("200 mi")).toBeInTheDocument();
  });

  it("should render Near Me button when locationActive is false", () => {
    const mockOnUseMyLocation = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        locationActive={false}
        onUseMyLocation={mockOnUseMyLocation}
      />,
    );

    const button = screen.getByTitle("Use my location");
    expect(button).toBeInTheDocument();
  });

  it("should call onUseMyLocation when Near Me button clicked", () => {
    const mockOnUseMyLocation = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        locationActive={false}
        onUseMyLocation={mockOnUseMyLocation}
      />,
    );

    fireEvent.click(screen.getByTitle("Use my location"));
    expect(mockOnUseMyLocation).toHaveBeenCalledTimes(1);
  });

  it("should render active Near Me button when locationActive is true", () => {
    const mockOnClearLocation = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        locationActive={true}
        onClearLocation={mockOnClearLocation}
      />,
    );

    const button = screen.getByTitle("Clear location");
    expect(button).toBeInTheDocument();
  });

  it("should call onClearLocation when active Near Me button clicked", () => {
    const mockOnClearLocation = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        locationActive={true}
        onClearLocation={mockOnClearLocation}
      />,
    );

    fireEvent.click(screen.getByTitle("Clear location"));
    expect(mockOnClearLocation).toHaveBeenCalledTimes(1);
  });

  it("should disable Near Me button while locationLoading is true", () => {
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        locationActive={false}
        locationLoading={true}
      />,
    );

    const button = screen.getByTitle("Use my location");
    expect(button).toBeDisabled();
  });

  it("should show autocomplete suggestions as the user types", async () => {
    const mockOnLocationSuggest = vi.fn().mockResolvedValue([
      { lat: 39.7392, lng: -104.9903, placeName: "Denver, Colorado" },
    ]);
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        onLocationSuggest={mockOnLocationSuggest}
      />,
    );

    const input = screen.getByLabelText("Search by location");
    fireEvent.change(input, { target: { value: "Denv" } });

    await waitFor(() =>
      expect(mockOnLocationSuggest).toHaveBeenCalledWith("Denv"),
    );
    expect(await screen.findByText("Denver")).toBeInTheDocument();
  });

  it("should not fetch suggestions for queries shorter than 2 chars", () => {
    const mockOnLocationSuggest = vi.fn().mockResolvedValue([]);
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        onLocationSuggest={mockOnLocationSuggest}
      />,
    );

    const input = screen.getByLabelText("Search by location");
    fireEvent.change(input, { target: { value: "D" } });

    expect(mockOnLocationSuggest).not.toHaveBeenCalled();
  });

  it("should call onLocationSelect (not onLocationSearch) when a suggestion is picked", async () => {
    const result = { lat: 39.7392, lng: -104.9903, placeName: "Denver, Colorado" };
    const mockOnLocationSuggest = vi.fn().mockResolvedValue([result]);
    const mockOnLocationSelect = vi.fn();
    const mockOnLocationSearch = vi.fn();
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        onLocationSuggest={mockOnLocationSuggest}
        onLocationSelect={mockOnLocationSelect}
        onLocationSearch={mockOnLocationSearch}
      />,
    );

    const input = screen.getByLabelText("Search by location");
    fireEvent.change(input, { target: { value: "Denver" } });

    const option = await screen.findByText("Denver");
    fireEvent.mouseDown(option);

    expect(mockOnLocationSelect).toHaveBeenCalledWith(result);
    expect(mockOnLocationSearch).not.toHaveBeenCalled();
  });

  it("should show a no-results message when suggestions come back empty", async () => {
    const mockOnLocationSuggest = vi.fn().mockResolvedValue([]);
    render(
      <SearchHeader
        searchQuery=""
        onSearchQueryChange={mockOnSearchQueryChange}
        sortOption="name"
        onSortChange={mockOnSortChange}
        onLocationSuggest={mockOnLocationSuggest}
      />,
    );

    const input = screen.getByLabelText("Search by location");
    fireEvent.change(input, { target: { value: "zzzznowhere" } });

    expect(await screen.findByText("No results found")).toBeInTheDocument();
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
