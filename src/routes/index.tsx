import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Users, UserPlus, Heart, MessageSquare, TrendingUp, Activity } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useStats,
  useGrowth,
  useGenderRatio,
  usePractice,
  useReports,
  useWeeklyActivity,
} from "@/lib/admin-hooks";

export const Route = createFileRoute("/")({
  component: Overview,
});

const PIE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
type GrowthRow = { month: string; count: number };

function toPercent(rows: { label: string; value: number }[]) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return rows.map((r, i) => ({
    name: r.label,
    value: Math.round((r.value / total) * 100),
    fill: PIE[i % PIE.length],
  }));
}

function Overview() {
  const navigate = useNavigate();
  const { data: stats } = useStats();
  const { data: growth } = useGrowth();
  const { data: gender } = useGenderRatio();
  const { data: practice } = usePractice();
  const { data: reports } = useReports();
  const { data: weekly } = useWeeklyActivity();
  const activityLevels = (weekly ?? []) as { day: string; messages: number; matches: number }[];
  const growthRows = (growth ?? []) as GrowthRow[];
  const growthData = growthRows.map((row) => ({ month: row.month, signups: row.count }));
  const genderData = toPercent((gender ?? []) as { label: string; value: number }[]);
  const practiceData = toPercent((practice ?? []) as { label: string; value: number }[]);
  const recentReports = reports ?? [];
  const newSignups = growthRows.at(-1)?.count ?? 0;

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard Overview"
        description="Real-time insights into your halal matrimony platform."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadCSV("halal-connect-overview", growthData);
                toast.success("Overview exported to CSV");
              }}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() =>
                toast.success("Report generation queued — you'll be notified when ready")
              }
              className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant"
            >
              <TrendingUp className="h-4 w-4 mr-2" /> Generate Report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={(stats?.totalUsers ?? 0).toLocaleString()}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="Online Now"
          value={(stats?.onlineNow ?? 0).toLocaleString()}
          icon={Activity}
          accent="success"
        />
        <StatCard
          label="New Signups (mo)"
          value={Number(newSignups).toLocaleString()}
          icon={UserPlus}
          accent="primary"
        />
        <StatCard
          label="Matches Created"
          value={(stats?.totalMatches ?? 0).toLocaleString()}
          icon={Heart}
          accent="warning"
        />
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">User Growth</h3>
              <p className="text-xs text-muted-foreground">New member signups by month</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {(stats?.usersYoyPercent ?? 0) >= 0 ? "+" : ""}
              {stats?.usersYoyPercent ?? 0}% YoY
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="signups"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#g1)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-1">Gender Ratio</h3>
          <p className="text-xs text-muted-foreground mb-4">Active members</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={genderData}
                dataKey="value"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {genderData.map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {genderData.map((g) => (
              <div key={g.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.fill }} />
                <span className="text-muted-foreground">{g.name}</span>
                <span className="font-semibold">{g.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Weekly Activity</h3>
              <p className="text-xs text-muted-foreground">Messages and matches per day</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityLevels}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="messages" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="matches" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-1">Religious Practice</h3>
          <p className="text-xs text-muted-foreground mb-4">User self-identification</p>
          <div className="space-y-3">
            {practiceData.map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.value}%`, background: r.fill }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Recent Reports Requiring Attention
            </h3>
            <p className="text-xs text-muted-foreground">Latest moderation queue</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/moderation" })}>
            View all
          </Button>
        </div>
        <div className="divide-y -mx-2">
          {recentReports.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-2 py-3">
              <div
                className={`h-2 w-2 rounded-full ${r.severity === "high" ? "bg-destructive" : r.severity === "medium" ? "bg-warning" : "bg-success"}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.reportedUser}</p>
                <p className="text-xs text-muted-foreground">
                  {r.category} · reported by {r.reporter}
                </p>
              </div>
              <Badge
                variant={r.status === "pending" ? "default" : "secondary"}
                className={
                  r.status === "pending"
                    ? "bg-gradient-primary text-primary-foreground border-0"
                    : ""
                }
              >
                {r.status}
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">{r.date}</span>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
