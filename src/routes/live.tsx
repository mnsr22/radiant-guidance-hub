import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Heart, MessageCircle, Users } from "lucide-react";
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
  useEffect(() => {
    const i = setInterval(() => setPulse((p) => p + 1), 2000);
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
    </AdminLayout>
  );
}
