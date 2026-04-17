import { createFileRoute } from "@tanstack/react-router";
import { Heart, TrendingUp, UserMinus, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { userGrowth } from "@/lib/mock-data";

export const Route = createFileRoute("/matches")({ component: Matches });

const funnel = [
  { stage: "Profile views", value: 100, count: "248,420" },
  { stage: "Likes sent", value: 62, count: "153,820" },
  { stage: "Mutual likes (matches)", value: 28, count: "69,580" },
  { stage: "Conversations started", value: 19, count: "47,120" },
  { stage: "Lasting connections", value: 7, count: "17,340" },
];

function Matches() {
  return (
    <AdminLayout>
      <PageHeader title="Match & Engagement Analytics" description="Where users connect — and where they drop off." />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Total matches" value="124,820" delta={{ value: "+8.4%", positive: true }} icon={Heart} accent="primary" />
        <StatCard label="Match success rate" value="28.4%" delta={{ value: "+1.2%", positive: true }} icon={TrendingUp} accent="success" />
        <StatCard label="Engagement rate" value="64%" delta={{ value: "+3.1%", positive: true }} icon={Sparkles} accent="primary" />
        <StatCard label="Drop-off (D7)" value="22%" delta={{ value: "-2.4%", positive: true }} icon={UserMinus} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <h3 className="font-semibold mb-4">Matches over time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={userGrowth}>
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
    </AdminLayout>
  );
}
