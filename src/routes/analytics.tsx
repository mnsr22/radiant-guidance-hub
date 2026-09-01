import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, TrendingUp, Users, Activity, DollarSign } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { downloadCSV } from "@/lib/csv";
import { userGrowth, activityLevels } from "@/lib/mock-data";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Daily and monthly active members, engagement, retention, revenue and feature adoption analytics for Halal Connect.",
      },
      { property: "og:title", content: "Analytics — Halal Connect Admin" },
      { property: "og:description", content: "Growth, engagement and revenue analytics for Halal Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const dauSeries = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  dau: 2100 + Math.round(Math.sin(i / 3) * 240) + i * 18,
  mau: 10200 + i * 96,
}));

const revenueSeries = [
  { month: "Apr", mrr: 4200, oneOff: 900 },
  { month: "May", mrr: 5120, oneOff: 1350 },
  { month: "Jun", mrr: 6040, oneOff: 1180 },
  { month: "Jul", mrr: 7310, oneOff: 1620 },
  { month: "Aug", mrr: 8420, oneOff: 2040 },
  { month: "Sep", mrr: 9780, oneOff: 1890 },
];

const adoption = [
  { feature: "Tasbih counter", adoption: 62, users: 6120 },
  { feature: "Prayer times", adoption: 78, users: 7690 },
  { feature: "Wali oversight", adoption: 21, users: 2070 },
  { feature: "Health disclosure", adoption: 14, users: 1380 },
  { feature: "Marriage checklist", adoption: 11, users: 1085 },
  { feature: "Nikah proposals", adoption: 6, users: 592 },
  { feature: "Voice messages (premium)", adoption: 27, users: 2660 },
];

const cohorts = [
  { cohort: "Sep 2025", size: 1840, d1: 62, d7: 41, d30: 27, churn: 4.1 },
  { cohort: "Aug 2025", size: 1620, d1: 58, d7: 38, d30: 24, churn: 4.8 },
  { cohort: "Jul 2025", size: 1410, d1: 55, d7: 35, d30: 22, churn: 5.4 },
  { cohort: "Jun 2025", size: 1210, d1: 53, d7: 33, d30: 20, churn: 6.0 },
];

const chartCfg = {
  dau: { label: "DAU", color: "var(--chart-1)" },
  mau: { label: "MAU", color: "var(--chart-2)" },
  mrr: { label: "MRR", color: "var(--chart-1)" },
  oneOff: { label: "One-off (VIP)", color: "var(--chart-3)" },
  messages: { label: "Messages", color: "var(--chart-1)" },
  matches: { label: "Matches", color: "var(--chart-2)" },
};

function AnalyticsPage() {
  const [range, setRange] = useState("30d");

  const stickiness = useMemo(() => {
    const last = dauSeries[dauSeries.length - 1];
    return Math.round((last.dau / last.mau) * 100);
  }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="Analytics"
        description="Growth, engagement, retention and revenue across the Halal Connect app."
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ok = downloadCSV(`halal-connect-analytics-${range}`, adoption);
                ok ? toast.success("Analytics exported") : toast.error("Nothing to export");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="DAU" value={dauSeries[dauSeries.length - 1].dau.toLocaleString()} icon={Activity} delta={{ value: "+6.2%", positive: true }} />
        <StatCard label="MAU" value={dauSeries[dauSeries.length - 1].mau.toLocaleString()} icon={Users} accent="success" delta={{ value: "+3.8%", positive: true }} />
        <StatCard label="Stickiness (DAU/MAU)" value={`${stickiness}%`} icon={TrendingUp} accent="warning" />
        <StatCard label="MRR" value="$9,780" icon={DollarSign} accent="success" delta={{ value: "+16%", positive: true }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Active members</CardTitle>
            <CardDescription>Daily vs monthly active members</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartCfg} className="h-[260px] w-full">
              <ResponsiveContainer>
                <AreaChart data={dauSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area dataKey="mau" stroke="var(--color-mau)" fill="var(--color-mau)" fillOpacity={0.12} />
                  <Area dataKey="dau" stroke="var(--color-dau)" fill="var(--color-dau)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Recurring vs one-off (VIP) revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartCfg} className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="mrr" fill="var(--color-mrr)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="oneOff" fill="var(--color-oneOff)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
            <CardDescription>Messages sent and matches made per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartCfg} className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={activityLevels}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="messages" fill="var(--color-messages)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="matches" fill="var(--color-matches)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature adoption</CardTitle>
            <CardDescription>Share of monthly active members using each feature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {adoption.map((f) => (
              <div key={f.feature} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.feature}</span>
                  <span className="text-muted-foreground">
                    {f.adoption}% · {f.users.toLocaleString()} members
                  </span>
                </div>
                <Progress value={f.adoption} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retention by signup cohort</CardTitle>
          <CardDescription>D1 / D7 / D30 retention and monthly churn</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cohort</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>D1</TableHead>
                <TableHead>D7</TableHead>
                <TableHead>D30</TableHead>
                <TableHead>Churn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((c) => (
                <TableRow key={c.cohort}>
                  <TableCell className="font-medium">{c.cohort}</TableCell>
                  <TableCell>{c.size.toLocaleString()}</TableCell>
                  <TableCell>{c.d1}%</TableCell>
                  <TableCell>{c.d7}%</TableCell>
                  <TableCell>{c.d30}%</TableCell>
                  <TableCell>
                    <Badge variant={c.churn > 5 ? "destructive" : "secondary"}>{c.churn}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Signup growth</CardTitle>
          <CardDescription>Cumulative members vs active members</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ users: { label: "Members", color: "var(--chart-1)" }, active: { label: "Active", color: "var(--chart-2)" } }} className="h-[260px] w-full">
            <ResponsiveContainer>
              <AreaChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="users" stroke="var(--color-users)" fill="var(--color-users)" fillOpacity={0.15} />
                <Area dataKey="active" stroke="var(--color-active)" fill="var(--color-active)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
