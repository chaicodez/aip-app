"use client";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="relative flex-1 max-w-xs">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--text-secondary)" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        name="search"
        defaultValue={defaultValue}
        placeholder="Search accounts…"
        className="w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all focus:outline-none"
        style={{
          background: "var(--fill-primary)",
          color: "var(--text-primary)",
          border: "1px solid transparent",
        }}
        onFocus={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.borderColor = "rgba(0,122,255,0.3)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.background = "var(--fill-primary)";
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}
