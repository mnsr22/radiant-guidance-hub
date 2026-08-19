import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AdminSidebar, SidebarNav, SidebarBrand } from "./sidebar";
import { AdminTopbar } from "./topbar";
import { cn } from "@/lib/utils";
import { getToken, onSessionExpired } from "@/lib/api";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Gate the whole admin shell: no token → bounce to /login.
  useEffect(() => {
    if (!getToken()) navigate({ to: "/login" });
    // Also react the moment a request kills the session, instead of leaving a
    // stale page up until the user happens to navigate somewhere else.
    return onSessionExpired(() => navigate({ to: "/login" }));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar lg:hidden">
          <div className="flex h-16 items-center px-4 border-b">
            <SidebarBrand />
          </div>
          <nav className="px-2 py-4 overflow-y-auto h-[calc(100vh-4rem)]">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
      <div className={cn("transition-all duration-300", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <AdminTopbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="p-4 lg:p-8 bg-gradient-hero min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
