import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, MessageSquare, Shield, Activity, Heart,
  Settings, Moon, Bell, CreditCard, FileText, Sparkles, ChevronLeft, Send, Megaphone, Inbox, Receipt, CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const adminNav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/chats", label: "Chat Monitoring", icon: MessageSquare },
  { to: "/messaging", label: "Messaging", icon: Send },
  { to: "/support", label: "Support Inbox", icon: Inbox },
  { to: "/moderation", label: "Moderation", icon: Shield },
  { to: "/live", label: "Live Activity", icon: Activity },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/islamic", label: "Islamic Features", icon: Moon },
  { to: "/tasbih", label: "Tasbih & Streaks", icon: CircleDot },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/ads", label: "Ads & Promotions", icon: Megaphone },
  { to: "/monetization", label: "Monetization", icon: CreditCard },
  { to: "/subscriptions", label: "Subscriptions", icon: Receipt },
  { to: "/logs", label: "Audit Logs", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  return (
    <ul className="space-y-1">
      {adminNav.map((item) => {
        const active =
          item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 overflow-hidden">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <Sparkles className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold">Halal Connect</div>
          <div className="text-[11px] text-muted-foreground">Admin Dashboard · v1.0</div>
        </div>
      )}
    </Link>
  );
}

export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <SidebarBrand collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <SidebarNav collapsed={collapsed} />
      </nav>

      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
