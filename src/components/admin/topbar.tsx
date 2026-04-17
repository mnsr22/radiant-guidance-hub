import { Bell, Search, Sun, MoonStar, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";

export function AdminTopbar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users, reports, conversations…"
          className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <Circle className="h-2 w-2 fill-success text-success" />
          </span>
          <span className="text-xs font-medium">1,284 online</span>
        </div>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px]">
            7
          </Badge>
        </Button>

        <div className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted/50 transition-colors cursor-pointer">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">SA</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-semibold">Sarah Admin</div>
            <div className="text-[10px] text-muted-foreground">Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
