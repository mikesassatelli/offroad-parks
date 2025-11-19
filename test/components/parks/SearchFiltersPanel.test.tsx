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

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, min, max, onValueChange }: any) => (
    <input
      type="range"
      value={value?.[0] ?? 0}
      min={min}
      max={max}
      onChange={(e) => onValueChange?.([parseInt(e.target.value, 10)])}
      data-testid="slider"
    />
  ),
}));

describe("SearchFiltersPanel", () => {
  const mockProps = {
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    selectedState: undefined,
    onStateChange: vi.fn(),
    availableStates: ["California", "Arizona", "Nevada"],
    selectedTerrains: [],
    onTerrainsChange: vi.fn(),
    selectedAmenities: [],
    onAmenitiesChange: vi.fn(),
    selectedCamping: [],
    onCampingChange: vi.fn(),
    selectedVehicleTypes: [],
    onVehicleTypesChange: vi.fn(),
    minTrailMiles: 0,
    onMinTrailMilesChange: vi.fn(),
    maxTrailMiles: 500,
    minAcres: 0,
    onMinAcresChange: vi.fn(),
    maxAcres: 10000,
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

  it('should render "All" option in state filter', () => {
    render(<SearchFiltersPanel {...mockProps} />);

    const allOption = screen.getByText("All");
    expect(allOption).toBeInTheDocument();
  });

  it("should render checkboxes for terrains, amenities, camping, and vehicle types", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    // Check that terrain checkboxes exist
    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i });
    expect(sandCheckbox).toBeInTheDocument();

    // Check that amenity checkboxes exist
    const restroomsCheckbox = screen.getByRole("checkbox", { name: /restrooms/i });
    expect(restroomsCheckbox).toBeInTheDocument();

    // Check that camping checkboxes exist
    const tentCheckbox = screen.getByRole("checkbox", { name: /tent/i });
    expect(tentCheckbox).toBeInTheDocument();

    // Check that vehicle type checkboxes exist
    const atvCheckbox = screen.getByRole("checkbox", { name: /atv/i });
    expect(atvCheckbox).toBeInTheDocument();
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

  it("should have no terrain checkboxes checked when no terrains selected", () => {
    render(<SearchFiltersPanel {...mockProps} selectedTerrains={[]} />);

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i }) as HTMLInputElement;
    expect(sandCheckbox.checked).toBe(false);
  });

  it("should check terrain checkbox when terrain is selected", () => {
    render(<SearchFiltersPanel {...mockProps} selectedTerrains={["sand"]} />);

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i }) as HTMLInputElement;
    expect(sandCheckbox.checked).toBe(true);
  });

  it("should have no amenity checkboxes checked when no amenities selected", () => {
    render(<SearchFiltersPanel {...mockProps} selectedAmenities={[]} />);

    const restroomsCheckbox = screen.getByRole("checkbox", { name: /restrooms/i }) as HTMLInputElement;
    expect(restroomsCheckbox.checked).toBe(false);
  });

  it("should check amenity checkbox when amenity is selected", () => {
    render(<SearchFiltersPanel {...mockProps} selectedAmenities={["restrooms"]} />);

    const restroomsCheckbox = screen.getByRole("checkbox", { name: /restrooms/i }) as HTMLInputElement;
    expect(restroomsCheckbox.checked).toBe(true);
  });

  it("should have no camping checkboxes checked when no camping selected", () => {
    render(<SearchFiltersPanel {...mockProps} selectedCamping={[]} />);

    const tentCheckbox = screen.getByRole("checkbox", { name: /tent/i }) as HTMLInputElement;
    expect(tentCheckbox.checked).toBe(false);
  });

  it("should check camping checkbox when camping is selected", () => {
    render(<SearchFiltersPanel {...mockProps} selectedCamping={["tent"]} />);

    const tentCheckbox = screen.getByRole("checkbox", { name: /tent/i }) as HTMLInputElement;
    expect(tentCheckbox.checked).toBe(true);
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
    expect(screen.getByText("restrooms")).toBeInTheDocument();
    expect(screen.getByText("showers")).toBeInTheDocument();
  });

  it("should render camping types from constants", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    // Check for some camping types (from ALL_CAMPING_TYPES constant)
    expect(screen.getByText("Tent")).toBeInTheDocument();
    expect(screen.getByText("RV 30A")).toBeInTheDocument();
  });

  it("should have correct structure with labels and inputs", () => {
    render(<SearchFiltersPanel {...mockProps} />);

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Terrain")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
    expect(screen.getByText("Camping")).toBeInTheDocument();
  });

  it("should render with all filters applied", () => {
    render(
      <SearchFiltersPanel
        {...mockProps}
        searchQuery="desert"
        selectedState="Arizona"
        selectedTerrains={["sand"]}
        selectedAmenities={["restrooms"]}
        selectedCamping={["tent"]}
      />,
    );

    const input = screen.getByPlaceholderText(
      "Search by name, city, state…",
    ) as HTMLInputElement;
    expect(input.value).toBe("desert");

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i }) as HTMLInputElement;
    expect(sandCheckbox.checked).toBe(true);

    const restroomsCheckbox = screen.getByRole("checkbox", { name: /restrooms/i }) as HTMLInputElement;
    expect(restroomsCheckbox.checked).toBe(true);

    const tentCheckbox = screen.getByRole("checkbox", { name: /tent/i }) as HTMLInputElement;
    expect(tentCheckbox.checked).toBe(true);
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

  it("should call onTerrainsChange when terrain checkbox is clicked", () => {
    render(<SearchFiltersPanel {...mockProps} selectedTerrains={[]} />);

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i });
    fireEvent.click(sandCheckbox);

    expect(mockProps.onTerrainsChange).toHaveBeenCalledWith(["sand"]);
  });

  it("should call onTerrainsChange to remove terrain when unchecking", () => {
    render(<SearchFiltersPanel {...mockProps} selectedTerrains={["sand", "rocks"]} />);

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i });
    fireEvent.click(sandCheckbox);

    expect(mockProps.onTerrainsChange).toHaveBeenCalledWith(["rocks"]);
  });

  it("should call onAmenitiesChange when amenity checkbox is clicked", () => {
    render(<SearchFiltersPanel {...mockProps} selectedAmenities={[]} />);

    const restroomsCheckbox = screen.getByRole("checkbox", { name: /restrooms/i });
    fireEvent.click(restroomsCheckbox);

    expect(mockProps.onAmenitiesChange).toHaveBeenCalledWith(["restrooms"]);
  });

  it("should call onAmenitiesChange to remove amenity when unchecking", () => {
    render(<SearchFiltersPanel {...mockProps} selectedAmenities={["restrooms", "showers"]} />);

    const restroomsCheckbox = screen.getByRole("checkbox", { name: /restrooms/i });
    fireEvent.click(restroomsCheckbox);

    expect(mockProps.onAmenitiesChange).toHaveBeenCalledWith(["showers"]);
  });

  it("should call onCampingChange when camping checkbox is clicked", () => {
    render(<SearchFiltersPanel {...mockProps} selectedCamping={[]} />);

    const tentCheckbox = screen.getByRole("checkbox", { name: /tent/i });
    fireEvent.click(tentCheckbox);

    expect(mockProps.onCampingChange).toHaveBeenCalledWith(["tent"]);
  });

  it("should call onCampingChange to remove camping when unchecking", () => {
    render(<SearchFiltersPanel {...mockProps} selectedCamping={["tent", "cabin"]} />);

    const tentCheckbox = screen.getByRole("checkbox", { name: /tent/i });
    fireEvent.click(tentCheckbox);

    expect(mockProps.onCampingChange).toHaveBeenCalledWith(["cabin"]);
  });
});
