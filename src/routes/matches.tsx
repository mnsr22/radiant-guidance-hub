import { createFileRoute } from "@tanstack/react-router";
import { Heart, TrendingUp, UserMinus, Sparkles, MessageCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { useMatches, useMatchStats, useMatchGrowth } from "@/lib/admin-hooks";

export const Route = createFileRoute("/matches")({ component: Matches });

function Matches() {
  const { data: matchesData } = useMatches();
  const { data: matchStats } = useMatchStats();
  const { data: growth } = useMatchGrowth();

  const growthData = ((growth ?? []) as any[]).map((g) => ({ month: g.month, active: g.count }));

  const rawFunnel = (matchStats?.funnel ?? []) as { stage: string; count: number }[];
  const funnelTop = rawFunnel[0]?.count || 1;
  const funnel = rawFunnel.map((s) => ({
    stage: s.stage,
    value: Math.round((s.count / funnelTop) * 100),
    count: s.count.toLocaleString(),
  }));

  const recentMatches = ((matchesData?.results ?? []) as any[]).map((m) => ({
    id: m.id,
    a: m.participants?.[0] ?? "—",
    b: m.participants?.[1] ?? "—",
    when: m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—",
  }));

  return (
    <AdminLayout>
      <PageHeader title="Match & Engagement Analytics" description="Where users connect — and where they drop off." />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Total matches" value={(matchStats?.total ?? matchesData?.total ?? 0).toLocaleString()} icon={Heart} accent="primary" />
        <StatCard label="Match success rate" value={`${matchStats?.successRate ?? 0}%`} icon={TrendingUp} accent="success" />
        <StatCard label="Engagement rate" value={`${matchStats?.engagementRate ?? 0}%`} icon={Sparkles} accent="primary" />
        <StatCard label="Conversations" value={(matchStats?.funnel?.[2]?.count ?? 0).toLocaleString()} icon={UserMinus} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Matches over time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="active" stroke="var(--chart-1)" strokeWidth={2} fill="url(#m1)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Engagement funnel</h3>
          <div className="space-y-4">
            {funnel.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No data yet.</div>
            )}
            {funnel.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium">{s.stage}</span>
                  <span className="text-muted-foreground tabular-nums">{s.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${s.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5 shadow-elegant">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> Recent successful matches
        </h3>
        <div className="space-y-2">
          {recentMatches.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No matches yet.</div>
          )}
          {recentMatches.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Heart className="h-4 w-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.a} ↔ {m.b}</div>
              </div>
              <span className="text-xs text-muted-foreground w-28 text-right">{m.when}</span>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
