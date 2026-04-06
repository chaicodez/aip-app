"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/crm",      label: "CRM" },
  { href: "/modeler",  label: "Modeler" },
  { href: "/cpq",      label: "CPQ" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-6 px-5 border-b"
      style={{
        height: "52px",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderColor: "var(--separator)",
      }}
    >
      {/* Wordmark */}
      <span
        className="font-semibold tracking-tight shrink-0"
        style={{ fontSize: "15px", color: "var(--text-primary)" }}
      >
        AIP
      </span>

      {/* Nav pill group */}
      <nav
        className="flex items-center gap-0.5 rounded-full p-1"
        style={{ background: "var(--fill-primary)" }}
      >
        {NAV_LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={
                active
                  ? {
                      background: "#fff",
                      boxShadow: "var(--shadow-sm)",
                      color: "var(--text-primary)",
                    }
                  : {
                      color: "var(--text-secondary)",
                    }
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
