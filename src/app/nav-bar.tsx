"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const NAV_LINKS = [
  { href: "/crm",      label: "CRM" },
  { href: "/modeler",  label: "Modeler" },
  { href: "/cpq",      label: "CPQ" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/settings", label: "Settings" },
];

interface NavUser {
  email: string;
  name: string;
  avatar_url: string | null;
}

function UserMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative ml-auto shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          // Close only when focus leaves the menu entirely
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "3px 8px 3px 3px",
          borderRadius: "999px",
          border: "1px solid var(--separator)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        {/* Avatar */}
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.name}
            width={26}
            height={26}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initials}
          </span>
        )}
        <span style={{ fontSize: "13px", color: "var(--text-primary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name || user.email}
        </span>
        {/* Chevron */}
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            borderRadius: "10px",
            border: "1px solid var(--separator)",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "var(--shadow-md)",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--separator)" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="POST" style={{ padding: "6px" }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                fontSize: "13px",
                color: "rgba(255,59,48,0.9)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,59,48,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function NavBar({ user }: { user: NavUser | null }) {
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

      {/* User menu */}
      {user && <UserMenu user={user} />}
    </header>
  );
}
