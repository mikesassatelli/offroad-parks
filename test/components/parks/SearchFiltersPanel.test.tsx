import { fireEvent, render, screen } from "@testing-library/react";
import { SearchFiltersPanel } from "@/components/parks/SearchFiltersPanel";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value} data-onvaluechange="handler">
      <button onClick={() => onValueChange?.("__all")}>Select All</button>
      <button onClick={() => onValueChange?.("California")}>
        Select California
      </button>
      <button onClick={() => onValueChange?.("sand")}>Select sand</button>
      <button onClick={() => onValueChange?.("camping")}>Select camping</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, onClick }: any) => (
    <div data-value={value} onClick={onClick}>
      {children}
    </div>
  ),
}));

describe("SearchFiltersPanel", () => {
  const mockProps = {
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    selectedState: undefined,
    onStateChange: vi.fn(),
    availableStates: ["California", "Arizona", "Nevada"],
    selectedTerrain: undefined,
    onTerrainChange: vi.fn(),
    selectedAmenity: undefined,
    onAmenityChange: vi.fn(),
    selectedVehicleType: undefined,
    onVehicleTypeChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render search input with placeholder", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const input = screen.getByPlaceholderText("Search by name, city, state…");
    expect(input).toBeInTheDocument();
  });

  it("should render search input with current query", () => {
    render(<SearchFiltersPanel {...mockProps} searchQuery="test park" />);

    const input = screen.getByPlaceholderText(
      "Search by name, city, state…",
    ) as HTMLInputElement;
    expect(input.value).toBe("test park");
  });

  it("should call onSearchQueryChange when search input changes", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const input = screen.getByPlaceholderText("Search by name, city, state…");
    fireEvent.change(input, { target: { value: "new query" } });

    expect(mockProps.onSearchQueryChange).toHaveBeenCalledWith("new query");
  });

  it("should render state filter label", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("State")).toBeInTheDocument();
  });

  it("should render terrain filter label", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Terrain")).toBeInTheDocument();
  });

  it("should render amenities filter label", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("should render available states in state filter", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("California")).toBeInTheDocument();
    expect(screen.getByText("Arizona")).toBeInTheDocument();
    expect(screen.getByText("Nevada")).toBeInTheDocument();
  });

  it('should render "All" option in state filter', () => {
    const { container } = render(<SearchFiltersPanel {...mockProps} />);

    // Find all "All" text nodes (state, terrain, amenity filters)
    const allOptions = screen.getAllByText("All");
    expect(allOptions.length).toBeGreaterThan(0);
  });

  it('should render "Any" option in terrain filter', () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const anyOptions = screen.getAllByText("Any");
    expect(anyOptions.length).toBeGreaterThan(0);
  });

  it('should render "Any" option in amenity filter', () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const anyOptions = screen.getAllByText("Any");
    expect(anyOptions.length).toBe(3); // Terrain, amenity, and vehicle type filters
  });

  it("should render Reset button", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const resetButton = screen.getByText("Reset");
    expect(resetButton).toBeInTheDocument();
  });

  it("should call onClearFilters when Reset button is clicked", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    expect(mockProps.onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("should render tip message", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(
      screen.getByText("Tip: Star favorites to plan a weekend loop."),
    ).toBeInTheDocument();
  });

  it("should set state select value to __all when no state selected", () => {
    const { container } = render(
      <SearchFiltersPanel {...mockProps} selectedState={undefined} />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    const stateSelect = selects[0];
    expect(stateSelect.getAttribute("data-value")).toBe("__all");
  });

  it("should set state select value to selected state", () => {
    const { container } = render(
      <SearchFiltersPanel {...mockProps} selectedState="California" />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    const stateSelect = selects[0];
    expect(stateSelect.getAttribute("data-value")).toBe("California");
  });

  it("should set terrain select value to __all when no terrain selected", () => {
    const { container } = render(
      <SearchFiltersPanel {...mockProps} selectedTerrain={undefined} />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    const terrainSelect = selects[1];
    expect(terrainSelect.getAttribute("data-value")).toBe("__all");
  });

  it("should set terrain select value to selected terrain", () => {
    const { container } = render(
      <SearchFiltersPanel {...mockProps} selectedTerrain="sand" />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    const terrainSelect = selects[1];
    expect(terrainSelect.getAttribute("data-value")).toBe("sand");
  });

  it("should set amenity select value to __all when no amenity selected", () => {
    const { container } = render(
      <SearchFiltersPanel {...mockProps} selectedAmenity={undefined} />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    const amenitySelect = selects[2];
    expect(amenitySelect.getAttribute("data-value")).toBe("__all");
  });

  it("should set amenity select value to selected amenity", () => {
    const { container } = render(
      <SearchFiltersPanel {...mockProps} selectedAmenity="camping" />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    const amenitySelect = selects[2];
    expect(amenitySelect.getAttribute("data-value")).toBe("camping");
  });

  it("should render empty state list when no states available", () => {
    render(<SearchFiltersPanel {...mockProps} availableStates={[]} />);

    // Should still render the component without errors
    expect(screen.getByText("State")).toBeInTheDocument();
  });

  it("should handle multiple states in availableStates", () => {
    const manyStates = ["California", "Arizona", "Nevada", "Texas", "Utah"];
    render(<SearchFiltersPanel {...mockProps} availableStates={manyStates} />);

    manyStates.forEach((state) => {
      expect(screen.getByText(state)).toBeInTheDocument();
    });
  });

  it("should render terrain types from constants", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    // Check for some terrain types (from ALL_TERRAIN_TYPES constant)
    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("rocks")).toBeInTheDocument();
    expect(screen.getByText("mud")).toBeInTheDocument();
  });

  it("should render amenities from constants", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    // Check for some amenities (from ALL_AMENITIES constant)
    expect(screen.getByText("camping")).toBeInTheDocument();
    expect(screen.getByText("restrooms")).toBeInTheDocument();
  });

  it("should have correct structure with labels and inputs", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Terrain")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("should render with all filters applied", () => {
    render(
      <SearchFiltersPanel
        {...mockProps}
        searchQuery="desert"
        selectedState="Arizona"
        selectedTerrain="sand"
        selectedAmenity="camping"
      />,
    );

    const input = screen.getByPlaceholderText(
      "Search by name, city, state…",
    ) as HTMLInputElement;
    expect(input.value).toBe("desert");

    const { container } = render(
      <SearchFiltersPanel
        {...mockProps}
        searchQuery="desert"
        selectedState="Arizona"
        selectedTerrain="sand"
        selectedAmenity="camping"
      />,
    );

    const selects = container.querySelectorAll('[data-testid="select"]');
    expect(selects[0].getAttribute("data-value")).toBe("Arizona");
    expect(selects[1].getAttribute("data-value")).toBe("sand");
    expect(selects[2].getAttribute("data-value")).toBe("camping");
  });

  it("should render Reset button with secondary variant", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const resetButton = screen.getByText("Reset");
    expect(resetButton).toHaveAttribute("data-variant", "secondary");
  });

  it("should call onSearchQueryChange with inline handler", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const input = screen.getByPlaceholderText("Search by name, city, state…");
    // Test the inline (e) => onSearchQueryChange(e.target.value) handler
    fireEvent.change(input, { target: { value: "test" } });

    expect(mockProps.onSearchQueryChange).toHaveBeenCalledWith("test");
  });

  it('should call onStateChange with undefined when "__all" is selected', () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const selectAllButton = screen.getAllByText("Select All")[0];
    fireEvent.click(selectAllButton);

    expect(mockProps.onStateChange).toHaveBeenCalledWith(undefined);
  });

  it("should call onStateChange with state value when specific state is selected", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const selectCaliforniaButton = screen.getAllByText("Select California")[0];
    fireEvent.click(selectCaliforniaButton);

    expect(mockProps.onStateChange).toHaveBeenCalledWith("California");
  });

  it('should call onTerrainChange with undefined when "__all" is selected', () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const selectAllButtons = screen.getAllByText("Select All");
    const terrainSelectAll = selectAllButtons[1];
    fireEvent.click(terrainSelectAll);

    expect(mockProps.onTerrainChange).toHaveBeenCalledWith(undefined);
  });

  it("should call onTerrainChange with terrain value when specific terrain is selected", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const selectSandButtons = screen.getAllByText("Select sand");
    const terrainSelectSand = selectSandButtons[1]; // Second one is terrain
    fireEvent.click(terrainSelectSand);

    expect(mockProps.onTerrainChange).toHaveBeenCalledWith("sand");
  });

  it('should call onAmenityChange with undefined when "__all" is selected', () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const selectAllButtons = screen.getAllByText("Select All");
    const amenitySelectAll = selectAllButtons[2];
    fireEvent.click(amenitySelectAll);

    expect(mockProps.onAmenityChange).toHaveBeenCalledWith(undefined);
  });

  it("should call onAmenityChange with amenity value when specific amenity is selected", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const selectCampingButtons = screen.getAllByText("Select camping");
    const amenitySelectCamping = selectCampingButtons[2]; // Third one is amenity
    fireEvent.click(amenitySelectCamping);

    expect(mockProps.onAmenityChange).toHaveBeenCalledWith("camping");
  });
});
