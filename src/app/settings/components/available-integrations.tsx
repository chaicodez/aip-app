const COMING_SOON = [
  { name: "HubSpot", type: "CRM", initials: "HS", color: "#FF7A59" },
  { name: "QuickBooks", type: "Accounting", initials: "QB", color: "#2CA01C" },
  { name: "Workday HRIS", type: "HRIS", initials: "WD", color: "#005CB9" },
  { name: "BambooHR", type: "HRIS", initials: "BB", color: "#73AC39" },
  { name: "Slack", type: "Messaging", initials: "SL", color: "#4A154B" },
];

export function AvailableIntegrations() {
  return (
    <div className="mt-6">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: "var(--text-secondary)", fontSize: "11px" }}
      >
        Available Integrations
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {COMING_SOON.map((item) => (
          <div
            key={item.name}
            className="bg-white rounded-2xl p-4 flex items-center gap-3 opacity-50"
            style={{ border: "1px solid var(--separator)", boxShadow: "var(--shadow-sm)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: item.color }}
            >
              {item.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {item.name}
              </p>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--fill-primary)", color: "var(--text-secondary)", fontSize: "10px" }}
              >
                Coming soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
