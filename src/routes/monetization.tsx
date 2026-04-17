import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Crown, DollarSign, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { userGrowth } from "@/lib/mock-data";

export const Route = createFileRoute("/monetization")({ component: Monetization });

const revenueData = userGrowth.map((m) => ({ month: m.month, revenue: Math.round(m.users * 0.42) }));

function Monetization() {
  return (
    <AdminLayout>
      <PageHeader title="Monetization" description="Subscriptions, premium tier and revenue overview." />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="MRR" value="$48,240" delta={{ value: "+14.2%", positive: true }} icon={DollarSign} accent="success" />
        <StatCard label="Premium users" value="2,184" delta={{ value: "+9.6%", positive: true }} icon={Crown} accent="warning" />
        <StatCard label="ARPU" value="$22.10" delta={{ value: "+2.1%", positive: true }} icon={TrendingUp} accent="primary" />
        <StatCard label="Active subs" value="2,420" delta={{ value: "+5.4%", positive: true }} icon={CreditCard} accent="primary" />
      </div>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-4">Revenue (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
            <Bar dataKey="revenue" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </AdminLayout>
  );
}
