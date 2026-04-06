import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agreement Intelligence Platform",
  description: "AIP — CRM, Modeler, CPQ, and iPaaS in one place",
};

const navLinks = [
  { href: "/crm",      label: "CRM" },
  { href: "/modeler",  label: "Modeler" },
  { href: "/cpq",      label: "CPQ" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8 sticky top-0 z-10">
          <span className="text-sm font-semibold text-gray-900 tracking-tight">AIP</span>
          <nav className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                {"icon" in link && link.icon && (
                  <span className="text-xs">{link.icon}</span>
                )}
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
