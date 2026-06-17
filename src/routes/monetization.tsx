import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Crown, DollarSign, TrendingUp, Pencil } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  usePlans,
  usePlanMutations,
  useBillingStats,
  useBillingRevenue,
  useTransactions,
} from "@/lib/admin-hooks";

export const Route = createFileRoute("/monetization")({ component: Monetization });

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const rel = (iso?: string) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

type Plan = { id: string; name: string; price: number; period: "mo" | "yr"; features: string[]; active: boolean };

function mapPlan(x: any): Plan {
  return {
    id: x.id,
    name: x.name ?? "",
    price: Math.round((x.priceCents ?? 0) / 100),
    period: x.interval === "year" ? "yr" : "mo",
    features: (x.features ?? []) as string[],
    active: x.visible !== false,
  };
}

function Monetization() {
  const { data: rawPlans } = usePlans();
  const plans = (rawPlans ?? []).map(mapPlan);
  const planMut = usePlanMutations();
  const { data: billing } = useBillingStats();
  const { data: revenue } = useBillingRevenue();
  const { data: txns } = useTransactions();
  const [editing, setEditing] = useState<Plan | null>(null);

  const revenueData = ((revenue ?? []) as any[]).map((r) => ({
    month: r.month,
    revenue: Math.round((r.revenueCents ?? 0) / 100),
  }));
  const transactions = ((txns ?? []) as any[]).map((t) => ({
    id: t.id,
    user: t.user,
    plan: t.plan,
    amount: Math.round((t.amountCents ?? 0) / 100),
    status: t.status === "succeeded" ? "success" : t.status,
    date: rel(t.createdAt),
  }));

  function savePlan() {
    if (!editing) return;
    const name = editing.name;
    planMut.update.mutate(
      { id: editing.id, body: { name: editing.name, priceCents: editing.price * 100 } },
      {
        onSuccess: () => {
          toast.success(`${name} plan updated`);
          setEditing(null);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update plan"),
      },
    );
  }

  return (
    <AdminLayout>
      <PageHeader title="Monetization" description="Subscriptions, premium tier and revenue overview." />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="MRR" value={money(billing?.mrrCents ?? 0)} icon={DollarSign} accent="success" />
        <StatCard label="Premium users" value={(billing?.premiumUsers ?? 0).toLocaleString()} icon={Crown} accent="warning" />
        <StatCard label="ARPU" value={money(billing?.arpuCents ?? 0)} icon={TrendingUp} accent="primary" />
        <StatCard label="Active subs" value={(billing?.activeSubs ?? 0).toLocaleString()} icon={CreditCard} accent="primary" />
      </div>

      <Card className="p-5 shadow-elegant mb-6">
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

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        {plans.map((p) => (
          <Card key={p.id} className="p-5 shadow-elegant">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="text-2xl font-bold mt-0.5">
                  ${p.price}<span className="text-sm text-muted-foreground font-normal">/{p.period}</span>
                </div>
              </div>
              <Badge className={p.active ? "bg-success/15 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                {p.active ? "Live" : "Hidden"}
              </Badge>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground mb-4">
              {p.features.map((f) => <li key={f}>• {f}</li>)}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) => {
                    planMut.update.mutate({ id: p.id, body: { visible: v } });
                    toast.success(`${p.name} ${v ? "enabled" : "hidden"}`);
                  }}
                />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing({ ...p })}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 shadow-elegant">
        <h3 className="font-semibold mb-4">Recent transactions</h3>
        <div className="space-y-2">
          {transactions.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.user}</div>
                <div className="text-xs text-muted-foreground">{t.plan} · {t.date}</div>
              </div>
              <div className="text-sm font-semibold tabular-nums">${t.amount}</div>
              <Badge className={
                t.status === "success" ? "bg-success/15 text-success border-0"
                : t.status === "refunded" ? "bg-warning/15 text-warning border-0"
                : "bg-destructive/15 text-destructive border-0"
              }>
                {t.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing && (
            <>
              <DialogHeader><DialogTitle>Edit {editing.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Plan name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price (USD)</Label>
                  <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={savePlan} className="bg-gradient-primary text-primary-foreground border-0">Save</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
