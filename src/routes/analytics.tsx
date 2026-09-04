import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Activity, Download, TrendingUp, Users, Wallet } from "lucide-react";

import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/csv";
import { mockUsers } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Halal Connect Admin" },
      { name: "description", content: "DAU/MAU, retention, revenue and feature adoption analytics for Halal Connect." },
      { property: "og:title", content: "Analytics — Halal Connect Admin" },
      { property: "og:description", content: "DAU/MAU, retention, revenue and feature adoption analytics for Halal Connect." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
type RangeKey = keyof typeof RANGES;

function seriesFor(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const base = 1200 + Math.round(Math.sin(i / 4) * 120) + i * 6;
    return {
      date: d.toISOString().slice(5, 10),
      dau: base,
      mau: 8200 + i * 22,
      messages: base * 6 + Math.round(Math.cos(i / 3) * 400),
      likes: base * 3,
      matches: Math.round(base / 7),
    };
  });
}

const revenueSeries = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(2026, i, 1).toLocaleString("en", { month: "short" }),
  mrr: 4200 + i * 380,
  vip: 900 + (i % 4) * 260,
  refunds: 120 + (i % 3) * 45,
}));

const adoption = [
  { feature: "Tasbih counter", pct: 62 },
  { feature: "Prayer times", pct: 71 },
  { feature: "Wali linked", pct: 28 },
  { feature: "Health disclosure", pct: 17 },
  { feature: "Marriage checklist", pct: 23 },
  { feature: "Private photos", pct: 44 },
];

const cohorts = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(2026, 2 + i, 1);
  const size = 480 + i * 55;
  return {
    cohort: d.toLocaleString("en", { month: "short", year: "numeric" }),
    size,
    w1: 100,
    w2: 74 - i,
    w4: 58 - i * 2,
    w8: 41 - i * 2,
    w12: 33 - i,
  };
});

function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const series = useMemo(() => seriesFor(RANGES[range]), [range]);

  const last = series[series.length - 1]!;
  const stickiness = ((last.dau / last.mau) * 100).toFixed(1);
  const premium = mockUsers.filter((u) => u.premium).length;
  const arpu = (revenueSeries[revenueSeries.length - 1]!.mrr / Math.max(premium, 1)).toFixed(2);

  return (
    <AdminLayout>
      <PageHeader
        title="Analytics"
        description="Growth, engagement, retention and revenue across Halal Connect."
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                const ok = downloadCSV(`halal-connect-analytics-${range}`, series);
                toast[ok ? "success" : "error"](ok ? "Analytics exported" : "Nothing to export");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Daily active users" value={last.dau.toLocaleString()} delta={{ value: "+4.8%", positive: true }} icon={Users} />
        <StatCard label="Monthly active users" value={last.mau.toLocaleString()} delta={{ value: "+2.1%", positive: true }} icon={Activity} accent="success" />
        <StatCard label="Stickiness (DAU/MAU)" value={`${stickiness}%`} icon={TrendingUp} accent="warning" />
        <StatCard label="ARPU (premium)" value={`$${arpu}`} icon={Wallet} accent="primary" />
      </div>

      <Tabs defaultValue="engagement">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="adoption">Feature adoption</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Active users</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="dau" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="DAU" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Messages, likes and matches</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" dot={false} />
                  <Line type="monotone" dataKey="likes" stroke="#a855f7" dot={false} />
                  <Line type="monotone" dataKey="matches" stroke="#22c55e" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle>MRR, one-off VIP and refunds</CardTitle></CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mrr" fill="hsl(var(--primary))" name="MRR ($)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="vip" fill="#a855f7" name="VIP one-off ($)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="refunds" fill="#ef4444" name="Refunds ($)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader><CardTitle>Cohort retention (%)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead><TableHead>Size</TableHead>
                    <TableHead>W1</TableHead><TableHead>W2</TableHead>
                    <TableHead>W4</TableHead><TableHead>W8</TableHead><TableHead>W12</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.map((c) => (
                    <TableRow key={c.cohort}>
                      <TableCell className="font-medium">{c.cohort}</TableCell>
                      <TableCell>{c.size}</TableCell>
                      <TableCell>{c.w1}%</TableCell>
                      <TableCell>{c.w2}%</TableCell>
                      <TableCell>{c.w4}%</TableCell>
                      <TableCell>{c.w8}%</TableCell>
                      <TableCell>{c.w12}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adoption">
          <Card>
            <CardHeader><CardTitle>Feature adoption</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {adoption.map((a) => (
                <div key={a.feature}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{a.feature}</span>
                    <span className="text-muted-foreground">{a.pct}%</span>
                  </div>
                  <Progress value={a.pct} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
