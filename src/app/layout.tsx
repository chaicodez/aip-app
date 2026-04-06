import type { Metadata } from "next";
import { NavBar } from "./nav-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agreement Intelligence Platform",
  description: "AIP — CRM, Modeler, CPQ, and iPaaS in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-primary)" }}>
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
