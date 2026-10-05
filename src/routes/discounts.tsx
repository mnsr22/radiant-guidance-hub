import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, TicketPercent, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv";
import { api } from "@/lib/api";

export const Route = createFileRoute("/discounts")({
  head: () => ({
    meta: [
      { title: "Discount Codes — Halal Connect Admin" },
      { name: "description", content: "Create and manage promotional discount codes for Halal Connect subscriptions." },
      { property: "og:title", content: "Discount Codes — Halal Connect Admin" },
      { property: "og:description", content: "Create and manage promotional discount codes for Halal Connect subscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscountsPage,
});

type Discount = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  plan: string;
  limit: number;
  used: number;
  expires: string;
  active: boolean;
};

const seed: Discount[] = [
  { id: "dsc_1", code: "RAMADAN30", type: "percent", value: 30, plan: "All plans", limit: 1000, used: 412, expires: "2026-04-20", active: true },
  { id: "dsc_2", code: "WELCOME10", type: "percent", value: 10, plan: "Premium monthly", limit: 5000, used: 2874, expires: "2026-12-31", active: true },
  { id: "dsc_3", code: "NIKAH5", type: "fixed", value: 5, plan: "VIP one-off", limit: 300, used: 118, expires: "2026-09-30", active: true },
  { id: "dsc_4", code: "EIDGIFT", type: "percent", value: 25, plan: "All plans", limit: 800, used: 800, expires: "2026-03-31", active: false },
];

function DiscountsPage() {
  const [rows, setRows] = useState<Discount[]>(seed);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    code: "",
    type: "percent" as Discount["type"],
    value: "10",
    plan: "All plans",
    limit: "100",
    expires: "",
  });

  useEffect(() => {
    api<any[]>("/admin/discounts")
      .then((items) => setRows(items.map((item) => ({
        id: String(item.id),
        code: item.code,
        type: item.type,
        value: Number(item.value),
        plan: item.appliesTo === "all" ? "All plans" : item.appliesTo === "premium_yearly" ? "Premium yearly" : item.appliesTo === "vip_once" ? "VIP one-off" : "Premium monthly",
        limit: Number(item.usageLimit ?? 0),
        used: Number(item.usedCount ?? 0),
        expires: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : "No expiry",
        active: item.active === true,
      }))))
      .catch(() => toast.error("Could not load discount codes from server"))
      .finally(() => setLoaded(true));
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active).length;
    const used = rows.reduce((a, r) => a + r.used, 0);
    const saved = rows.reduce(
      (a, r) => a + (r.type === "percent" ? r.used * 0.3 * r.value : r.used * r.value),
      0,
    );
    return { active, used, saved: Math.round(saved) };
  }, [rows]);

  async function create() {
    if (!draft.code.trim()) {
      toast.error("Give the code a name, e.g. RAMADAN30");
      return;
    }
    try {
      const created: any = await api("/admin/discounts", { method: "POST", body: {
        code: draft.code.trim().toUpperCase(),
        type: draft.type,
        value: Number(draft.value),
        appliesTo: draft.plan === "All plans" ? "all" : draft.plan === "VIP one-off" ? "vip_once" : draft.plan === "Premium yearly" ? "premium_yearly" : "premium_monthly",
        usageLimit: Number(draft.limit) || null,
        expiresAt: draft.expires || null,
        active: true,
      } });
      setRows((r) => [{
        id: String(created.id),
        code: created.code,
        type: created.type,
        value: created.value,
        plan: draft.plan,
        limit: created.usageLimit ?? 0,
        used: created.usedCount ?? 0,
        expires: created.expiresAt ? new Date(created.expiresAt).toISOString().slice(0, 10) : "No expiry",
        active: created.active,
      }, ...r]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create discount code");
      return;
    }
    setOpen(false);
    setDraft({ code: "", type: "percent", value: "10", plan: "All plans", limit: "100", expires: "" });
    toast.success("Discount code created");
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Discount Codes"
        description="Run promotions on subscriptions, cap redemptions and switch codes off at any time."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadCSV("halal-connect-discount-codes", rows);
                toast.success("Export started");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create discount code</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      placeholder="RAMADAN30"
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Discount type</Label>
                      <Select
                        value={draft.type}
                        onValueChange={(v) => setDraft({ ...draft, type: v as Discount["type"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage off</SelectItem>
                          <SelectItem value="fixed">Fixed amount off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        type="number"
                        value={draft.value}
                        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Applies to</Label>
                      <Select value={draft.plan} onValueChange={(v) => setDraft({ ...draft, plan: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All plans">All plans</SelectItem>
                          <SelectItem value="Premium monthly">Premium monthly</SelectItem>
                          <SelectItem value="Premium yearly">Premium yearly</SelectItem>
                          <SelectItem value="VIP one-off">VIP one-off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="limit">Redemption limit</Label>
                      <Input
                        id="limit"
                        type="number"
                        value={draft.limit}
                        onChange={(e) => setDraft({ ...draft, limit: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expires">Expires</Label>
                    <Input
                      id="expires"
                      type="date"
                      value={draft.expires}
                      onChange={(e) => setDraft({ ...draft, expires: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={create}>Create code</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active codes" value={String(stats.active)} icon={TicketPercent} />
        <StatCard label="Total redemptions" value={stats.used.toLocaleString()} icon={TrendingUp} />
        <StatCard label="Estimated discount given" value={`$${stats.saved.toLocaleString()}`} icon={Wallet} />
      </div>

      {!loaded && <p className="mt-4 text-sm text-muted-foreground">Loading discount codes…</p>}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All codes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-semibold">{r.code}</TableCell>
                  <TableCell>
                    {r.type === "percent" ? `${r.value}% off` : `$${r.value} off`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.used.toLocaleString()} / {r.limit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.expires}</TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={r.active}
                      onCheckedChange={(v) => {
                        api(`/admin/discounts/${r.id}`, { method: "PATCH", body: { active: v } })
                          .then(() => {
                            setRows((list) => list.map((x) => (x.id === r.id ? { ...x, active: v } : x)));
                            toast.success(v ? `${r.code} switched on` : `${r.code} switched off`);
                          })
                          .catch((error) => toast.error(error instanceof Error ? error.message : "Could not update code"));
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
