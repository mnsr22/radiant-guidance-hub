import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import logo from "@/assets/halal-connect-logo.png";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Halal Connect</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/delete-account" className="hover:text-foreground">Delete account</Link>
            <Link to="/help" className="hover:text-foreground">Support</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
      <footer className="border-t mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} Halal Connect</span>
          <span>Contact: privacy@halalconnect.space</span>
        </div>
      </footer>
    </div>
  );
}