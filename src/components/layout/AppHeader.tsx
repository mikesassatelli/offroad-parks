import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import type { SortOption } from "@/hooks/useFilteredParks";

interface AppHeaderProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

export function AppHeader({ sortOption, onSortChange }: AppHeaderProps) {
  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  return (
    <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-3">
        <div className="text-2xl font-bold tracking-tight text-foreground">
          🏞️ UTV Parks
        </div>
        <span className="ml-1 inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
          beta
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Select onValueChange={handleSortChange} value={sortOption}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="price">Lowest Day Pass</SelectItem>
              <SelectItem value="miles">Most Trail Miles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
