import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Download, Heart, UserPlus, Users } from "lucide-react";

import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCSV } from "@/lib/csv";
import {
  useBillingRevenue,
  useBillingStats,
  useGrowth,
  useMatchGrowth,
  useMatchStats,
  useStats,
  useWeeklyActivity,
} from "@/lib/admin-hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Halal Connect Admin" },
      {
        name: "description",
        content: "Live signup, weekly activity, revenue, and match analytics for Halal Connect.",
      },
      { property: "og:title", content: "Analytics — Halal Connect Admin" },
      {
        property: "og:description",
        content: "Live signup, weekly activity, revenue, and match analytics for Halal Connect.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

type MonthlyCount = { month: string; count: number };
type WeeklyActivity = { day: string; messages: number; matches: number };
type MonthlyRevenue = { month: string; currency: string; revenueAmount: number };

const REVENUE_COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#0ea5e9", "#ef4444"];

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en", {
    month: "short",
    year: "2-digit",
  });
}

function AnalyticsPage() {
  const { data: stats } = useStats();
  const { data: growth } = useGrowth();
  const { data: weekly } = useWeeklyActivity();
  const { data: billingStats } = useBillingStats();
  const { data: revenue } = useBillingRevenue();
  const { data: matchStats } = useMatchStats();
  const { data: matchGrowth } = useMatchGrowth();

  const signupData = ((growth ?? []) as MonthlyCount[]).map((row) => ({
    month: monthLabel(row.month),
    signups: row.count,
  }));
  const weeklyData = (weekly ?? []) as WeeklyActivity[];
  const revenueRows = (revenue ?? []) as MonthlyRevenue[];
  const revenueCurrencies = [...new Set(revenueRows.map((row) => row.currency))];
  const revenueByMonth = new Map<string, Record<string, string | number>>();
  for (const row of revenueRows) {
    const month = revenueByMonth.get(row.month) ?? { month: monthLabel(row.month) };
    month[row.currency] = row.revenueAmount;
    revenueByMonth.set(row.month, month);
  }
  const revenueData = [...revenueByMonth.values()];
  const matchData = ((matchGrowth ?? []) as MonthlyCount[]).map((row) => ({
    month: monthLabel(row.month),
    matches: row.count,
  }));
  const matchFunnel = (matchStats?.funnel ?? []) as Array<{
    stage: string;
    count: number;
  }>;
  const latestSignupCount = signupData.at(-1)?.signups;

  return (
    <AdminLayout>
      <PageHeader
        title="Analytics"
        description="Live signup, activity, revenue, and match metrics from the Halal Connect API."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={signupData.length === 0}
              onClick={() => {
                const ok = downloadCSV("halal-connect-monthly-signups", signupData);
                toast[ok ? "success" : "error"](ok ? "Signups exported" : "Nothing to export");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export signups
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          label="Total members"
          value={Number(stats?.totalUsers ?? 0).toLocaleString()}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="Signups this month"
          value={latestSignupCount?.toLocaleString() ?? "—"}
          icon={UserPlus}
          accent="success"
        />
        <StatCard
          label="Active subscriptions"
          value={Number(billingStats?.activeSubs ?? 0).toLocaleString()}
          icon={Activity}
          accent="warning"
        />
        <StatCard
          label="Match success rate"
          value={matchStats ? `${matchStats.successRate}%` : "—"}
          icon={Heart}
          accent="primary"
        />
      </div>

      <Tabs defaultValue="engagement">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="growth">Signups</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <Card>
            <CardHeader>
              <CardTitle>Monthly signups</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {signupData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signup history is available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="signups"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages and matches per day</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {weeklyData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity is available yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="messages"
                      fill="hsl(var(--primary))"
                      name="Messages"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar dataKey="matches" fill="#22c55e" name="Matches" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Successful revenue by currency</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              {revenueData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No successful payment history is available yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    {revenueCurrencies.map((currency, index) => (
                      <Bar
                        key={currency}
                        dataKey={currency}
                        fill={REVENUE_COLORS[index % REVENUE_COLORS.length]}
                        name={currency}
                        radius={[6, 6, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly matches</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {matchData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No match history is available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={matchData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="matches" stroke="#22c55e" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Match funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {matchFunnel.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No match funnel data is available yet.
                </p>
              ) : (
                matchFunnel.map((stage) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <span className="text-sm">{stage.stage}</span>
                    <span className="font-semibold tabular-nums">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <p className="mt-4 text-xs text-muted-foreground">
        Cohort retention and feature adoption are not shown because the backend does not currently
        collect those metrics.
      </p>
    </AdminLayout>
  );
}
