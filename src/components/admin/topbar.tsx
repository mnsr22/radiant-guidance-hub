import { Bell, Search, Sun, MoonStar, Circle, LogOut, User, Menu } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useMe, useLive, useStats } from "@/lib/admin-hooks";
import { clearToken } from "@/lib/api";

function initials(name?: string) {
  if (!name) return "AD";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function roleLabel(role?: string) {
  return role === "admin" ? "Administrator" : role ? role : "Admin";
}

export function AdminTopbar({ onOpenMobile }: { onOpenMobile?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: live } = useLive();
  const onlineCount = live?.onlineCount ?? 0;
  const { data: stats } = useStats();
  const pendingReports = stats?.pendingReports ?? 0;

  function signOut() {
    clearToken();
    toast.success("Signed out");
    navigate({ to: "/login" });
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden -ml-2"
        aria-label="Open menu"
        onClick={onOpenMobile}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <form
        className="relative flex-1 max-w-md hidden sm:block"
        onSubmit={(e) => {
          e.preventDefault();
          const value = (new FormData(e.currentTarget).get("q") as string)?.trim();
          if (!value) return;
          navigate({ to: "/users" });
          toast.info(`Searching users for "${value}"`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Search users, reports, conversations…"
          className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <Circle className="h-2 w-2 fill-success text-success" />
          </span>
          <span className="text-xs font-medium tabular-nums">{onlineCount.toLocaleString()} online</span>
        </div>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          onClick={() => navigate({ to: "/notifications" })}
        >
          <Bell className="h-4 w-4" />
          {pendingReports > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px]">
              {pendingReports > 9 ? "9+" : pendingReports}
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted/50 transition-colors">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  {initials(me?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block leading-tight text-left">
                <div className="text-xs font-semibold">{me?.name ?? "Admin"}</div>
                <div className="text-[10px] text-muted-foreground">{roleLabel(me?.role)}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="leading-tight">
                <div className="font-semibold">{me?.name ?? "My account"}</div>
                {me?.email && <div className="text-[11px] font-normal text-muted-foreground truncate">{me.email}</div>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <User className="h-4 w-4 mr-2" /> Profile & settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/logs" })}>
              <Bell className="h-4 w-4 mr-2" /> Audit logs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
