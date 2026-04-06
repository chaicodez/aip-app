"use client";

const QUICK_FILTERS = [
  "90-day renewals",
  "High discount",
  "Missing escalator",
  "Payment terms > 30 days",
  "No SLA clause",
  "ACV > $100K",
] as const;

interface QueryBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

export default function QueryBar({
  searchQuery,
  onSearchChange,
  activeFilters,
  onFiltersChange,
}: QueryBarProps) {
  function toggleFilter(filter: string) {
    if (activeFilters.includes(filter)) {
      onFiltersChange(activeFilters.filter((f) => f !== filter));
    } else {
      onFiltersChange([...activeFilters, filter]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
          ✦
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by customer, industry, value range..."
          className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => {
          const active = activeFilters.includes(filter);
          return (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 text-gray-600 hover:border-gray-500"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
