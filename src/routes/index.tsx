import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, Heart, MessageSquare, TrendingUp, Activity } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { activityLevels, genderRatio, religiousPractice, userGrowth, mockReports } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Overview,
});

function Overview() {
  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard Overview"
        description="Real-time insights into your halal matrimony platform."
        actions={
          <>
            <Button variant="outline" size="sm">Export CSV</Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground border-0 shadow-elegant">
              <TrendingUp className="h-4 w-4 mr-2" /> Generate Report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value="15,240" delta={{ value: "+12.4%", positive: true }} icon={Users} accent="primary" />
        <StatCard label="Active Today" value="3,820" delta={{ value: "+5.8%", positive: true }} icon={Activity} accent="success" />
        <StatCard label="New Signups" value="284" delta={{ value: "+18%", positive: true }} icon={UserPlus} accent="primary" />
        <StatCard label="Matches Created" value="1,124" delta={{ value: "-2.1%", positive: false }} icon={Heart} accent="warning" />
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">User Growth</h3>
              <p className="text-xs text-muted-foreground">Monthly total vs active users</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">+248% YoY</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={userGrowth}>
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
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="users" stroke="var(--chart-1)" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="active" stroke="var(--chart-2)" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-elegant">
          <h3 className="font-semibold mb-1">Gender Ratio</h3>
          <p className="text-xs text-muted-foreground mb-4">Active members</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={genderRatio} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={4}>
                {genderRatio.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {genderRatio.map((g) => (
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
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
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
            {religiousPractice.map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.value}%`, background: r.fill }} />
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
          <Button variant="ghost" size="sm">View all</Button>
        </div>
        <div className="divide-y -mx-2">
          {mockReports.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-2 py-3">
              <div className={`h-2 w-2 rounded-full ${r.severity === "high" ? "bg-destructive" : r.severity === "medium" ? "bg-warning" : "bg-success"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.reportedUser}</p>
                <p className="text-xs text-muted-foreground">{r.category} · reported by {r.reporter}</p>
              </div>
              <Badge variant={r.status === "pending" ? "default" : "secondary"} className={r.status === "pending" ? "bg-gradient-primary text-primary-foreground border-0" : ""}>
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

// Re-export to keep existing template references happy
export { Overview as Index };
const _line = LineChart; void _line; // ensure recharts tree-shake doesn't drop type
const _line2 = Line; void _line2;
