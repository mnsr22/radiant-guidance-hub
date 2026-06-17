import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Users, MapPin, UserPlus, ShieldAlert, CreditCard, Shield } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { useLive } from "@/lib/admin-hooks";
import { useAdminFeed, type AdminFeedType } from "@/lib/admin-socket";

export const Route = createFileRoute("/live")({ component: Live });

const FEED_TYPES: AdminFeedType[] = ["signup", "match", "message", "subscription", "report", "moderation"];
const FEED_LABEL: Record<AdminFeedType, string> = {
  signup: "Signups",
  match: "Matches",
  message: "Messages",
  report: "Reports",
  subscription: "Subscriptions",
  moderation: "Moderation",
};

const FEED_ICON: Record<AdminFeedType, typeof Heart> = {
  signup: UserPlus,
  match: Heart,
  message: MessageCircle,
  report: ShieldAlert,
  subscription: CreditCard,
  moderation: Shield,
};
const FEED_COLOR: Record<AdminFeedType, string> = {
  signup: "text-success",
  match: "text-warning",
  message: "text-primary",
  report: "text-destructive",
  subscription: "text-success",
  moderation: "text-warning",
};

function rel(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Live() {
  const navigate = useNavigate();
  const { data: live } = useLive();
  const { events, connected } = useAdminFeed();
  const [active, setActive] = useState<Set<AdminFeedType>>(new Set());

  function toggleType(t: AdminFeedType) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }
  const shown = active.size === 0 ? events : events.filter((e) => active.has(e.type));

  // Route a feed item to the most relevant screen based on its metadata.
  function openEvent(meta?: Record<string, unknown>) {
    if (!meta) return;
    if (meta.support) navigate({ to: "/support" });
    else if (meta.reportId || meta.reportedId) navigate({ to: "/moderation" });
    else if (meta.conversationId) navigate({ to: "/chats" });
    else if (meta.userId) navigate({ to: "/users" });
  }

  const onlineNow = live?.onlineCount ?? 0;
  const messages = live?.messagesPerMin ?? 0;
  const matches = live?.matchesPerMin ?? 0;
  const regions = ((live?.topRegions ?? []) as { country: string; users: number }[]);
  const regionMax = regions[0]?.users || 1;

  return (
    <AdminLayout>
      <PageHeader
        title="Live Activity Monitor"
        description="Real-time platform activity streamed over WebSocket."
        actions={
          <Badge
            className={`border-0 gap-1.5 ${connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
          >
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`} />
            </span>
            {connected ? "Live" : "Connecting…"}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Users online" value={onlineNow.toLocaleString()} icon={Users} accent="success" />
        <StatCard label="Messages / min" value={messages.toLocaleString()} icon={MessageCircle} accent="primary" />
        <StatCard label="Matches / min" value={matches.toLocaleString()} icon={Heart} accent="warning" />
        <StatCard label="Top region" value={regions[0]?.country ?? "—"} icon={MapPin} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Top regions by members</h3>
          <div className="space-y-3">
            {regions.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No region data yet.</div>
            )}
            {regions.map((r) => (
              <div key={r.country} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium truncate">{r.country}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${(r.users / regionMax) * 100}%` }} />
                </div>
                <div className="w-16 text-right text-sm tabular-nums text-muted-foreground">{r.users}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h3 className="font-semibold">Live event feed</h3>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setActive(new Set())}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${
                  active.size === 0 ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                All
              </button>
              {FEED_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${
                    active.has(t) ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {FEED_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {shown.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {events.length === 0 ? "Waiting for activity…" : "No events match this filter."}
              </div>
            )}
            {shown.map((e) => {
              const Icon = FEED_ICON[e.type] ?? MessageCircle;
              const color = FEED_COLOR[e.type] ?? "text-primary";
              const clickable = !!(e.meta && (e.meta.userId || e.meta.reportId || e.meta.reportedId || e.meta.conversationId));
              return (
                <div
                  key={e.id}
                  onClick={() => clickable && openEvent(e.meta)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border animate-in fade-in slide-in-from-top-1 ${clickable ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                  <div className="flex-1 text-sm">{e.text}</div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{rel(e.at)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
