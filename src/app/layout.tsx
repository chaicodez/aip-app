import type { Metadata } from "next";
import { NavBar } from "./nav-bar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agreement Intelligence Platform",
  description: "AIP — CRM, Modeler, CPQ, and iPaaS in one place",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const navUser = user
    ? {
        email: user.email ?? "",
        name: (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              user.email ??
              "",
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }
    : null;

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-primary)" }}>
        {navUser && <NavBar user={navUser} />}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
