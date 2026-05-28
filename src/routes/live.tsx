import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Heart, MessageCircle, Users, UserPlus, ShieldAlert } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";

export const Route = createFileRoute("/live")({ component: Live });

const REGIONS = [
  { city: "London", country: "UK", users: 412 },
  { city: "Dubai", country: "UAE", users: 388 },
  { city: "Istanbul", country: "TR", users: 356 },
  { city: "Kuala Lumpur", country: "MY", users: 298 },
  { city: "Toronto", country: "CA", users: 244 },
  { city: "New York", country: "US", users: 221 },
  { city: "Karachi", country: "PK", users: 197 },
  { city: "Jakarta", country: "ID", users: 184 },
];

function Live() {
  const [pulse, setPulse] = useState(0);
  const [events, setEvents] = useState<{ id: number; type: string; text: string; time: string }[]>([
    { id: 0, type: "match", text: "Aisha H. ↔ Yusuf K. matched", time: "just now" },
    { id: 1, type: "signup", text: "Maryam I. joined from London", time: "30s ago" },
    { id: 2, type: "message", text: "187 new messages in last minute", time: "1m ago" },
    { id: 3, type: "report", text: "New report filed · Harassment", time: "2m ago" },
  ]);

  useEffect(() => {
    const i = setInterval(() => {
      setPulse((p) => p + 1);
      setEvents((prev) => {
        const samples = [
          { type: "match", text: ["Omar A. ↔ Sara H. matched", "Ibrahim K. ↔ Layla R. matched", "Bilal Q. ↔ Hafsa M. matched"] },
          { type: "signup", text: ["New signup from Dubai", "New signup from Toronto", "New signup from Jakarta"] },
          { type: "message", text: ["12 messages in last 10s", "Surge: +24 messages", "Conversation milestone: 200 msgs"] },
          { type: "report", text: ["Report filed · Spam", "Report filed · Fake Profile", "Wali verification requested"] },
        ];
        const s = samples[Math.floor(Math.random() * samples.length)];
        const text = s.text[Math.floor(Math.random() * s.text.length)];
        return [{ id: Date.now(), type: s.type, text, time: "just now" }, ...prev].slice(0, 15);
      });
    }, 2500);
    return () => clearInterval(i);
  }, []);

  const onlineNow = 1284 + (pulse % 12);
  const messages = 142 + (pulse % 8);
  const matches = 38 + (pulse % 5);

  return (
    <AdminLayout>
      <PageHeader
        title="Live Activity Monitor"
        description="Real-time platform activity, refreshing every 2 seconds."
        actions={
          <Badge className="bg-success/15 text-success border-0 gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Users online" value={onlineNow.toLocaleString()} icon={Users} accent="success" />
        <StatCard label="Messages / min" value={messages.toString()} icon={MessageCircle} accent="primary" />
        <StatCard label="Matches / min" value={matches.toString()} icon={Heart} accent="warning" />
        <StatCard label="Active sessions" value="3,420" icon={Activity} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Top regions right now</h3>
          <div className="space-y-3">
            {REGIONS.map((r) => (
              <div key={r.city} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{r.city}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${(r.users / 412) * 100}%` }} />
                </div>
                <div className="w-16 text-right text-sm tabular-nums text-muted-foreground">{r.users}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Live event feed</h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {events.map((e) => {
              const Icon = e.type === "match" ? Heart : e.type === "signup" ? UserPlus : e.type === "report" ? ShieldAlert : MessageCircle;
              const color = e.type === "match" ? "text-warning" : e.type === "signup" ? "text-success" : e.type === "report" ? "text-destructive" : "text-primary";
              return (
                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border animate-in fade-in slide-in-from-top-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <div className="flex-1 text-sm">{e.text}</div>
                  <span className="text-xs text-muted-foreground">{e.time}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
