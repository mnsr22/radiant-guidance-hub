import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useRemoteList } from "@/lib/remote";

export const Route = createFileRoute("/gifts")({
  head: () => ({
    meta: [
      { title: "Gifts — Halal Connect Admin" },
      { name: "description", content: "Manage the gift catalogue members buy and send, and the cash-out threshold." },
      { property: "og:title", content: "Gifts — Halal Connect Admin" },
      { property: "og:description", content: "Manage the gift catalogue members buy and send, and the cash-out threshold." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GiftsPage,
});

type GiftRow = { id: string; name: string; emoji: string; price: number; payoutValue: number; active: boolean; currency: string };

const SAMPLE: GiftRow[] = [
  { id: "g1", name: "Rose", emoji: "🌹", price: 2000, payoutValue: 1400, active: true, currency: "UGX" },
  { id: "g2", name: "Dates box", emoji: "🌴", price: 5000, payoutValue: 3500, active: true, currency: "UGX" },
  { id: "g3", name: "Oud perfume", emoji: "🧴", price: 20000, payoutValue: 14000, active: true, currency: "UGX" },
  { id: "g4", name: "Ring", emoji: "💍", price: 100000, payoutValue: 70000, active: false, currency: "UGX" },
];

const empty: GiftRow = { id: "", name: "", emoji: "🎁", price: 0, payoutValue: 0, active: true, currency: "UGX" };

function fromApi(row: any): GiftRow {
  return {
    id: String(row.id),
    name: row.name ?? "",
    emoji: row.image ?? "🎁",
    price: Number(row.price ?? 0),
    payoutValue: Number(row.cashValue ?? 0),
    active: row.enabled !== false,
    currency: row.currency ?? "UGX",
  };
}

function toApi(row: GiftRow) {
  return { name: row.name, image: row.emoji, price: row.price, cashValue: row.payoutValue, enabled: row.active, currency: row.currency };
}

function GiftsPage() {
  const { rows, mutate, add } = useRemoteList<GiftRow>("/admin/gifts", SAMPLE, fromApi);
  const [edit, setEdit] = useState<GiftRow | null>(null);
  const [threshold, setThreshold] = useState(50000);

  useEffect(() => {
    api<{ minWithdrawal?: number; withdrawThreshold?: number }>("/admin/wallet/settings")
      .then((settings) => setThreshold(settings.withdrawThreshold ?? settings.minWithdrawal ?? 50000))
      .catch(() => undefined);
  }, []);

  async function saveGift() {
    if (!edit || !edit.name || edit.price <= 0) return toast.error("Name and price are required");
    if (edit.payoutValue > edit.price) return toast.error("Receiver value can't exceed the price");
    try {
      if (edit.id) {
        await mutate(() => api(`/admin/gifts/${edit.id}`, { method: "PATCH", body: toApi(edit) }), edit.id, edit);
      } else {
        const created = await api<any>("/admin/gifts", { method: "POST", body: toApi(edit) });
        add(fromApi(created));
      }
      toast.success("Gift saved — visible in the app immediately");
      setEdit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveThreshold() {
    try {
      await api("/admin/wallet/settings", { method: "PATCH", body: { withdrawThreshold: threshold } });
      toast.success("Cash-out minimum updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Gifts"
        description="Members buy gifts with Pesapal and send them to anyone. Receivers earn the receiver value toward a cash-out."
        actions={<Button onClick={() => setEdit({ ...empty })}><Plus className="mr-2 h-4 w-4" />New gift</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Catalogue</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Gift</TableHead><TableHead>Price</TableHead><TableHead>Receiver gets</TableHead><TableHead>Shown</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.emoji} {g.name}</TableCell>
                    <TableCell>{g.price.toLocaleString()}</TableCell>
                    <TableCell>{g.payoutValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Switch checked={g.active} onCheckedChange={(v) =>
                        mutate(() => api(`/admin/gifts/${g.id}`, { method: "PATCH", body: { enabled: v } }), g.id, { active: v })
                          .then(() => toast.success(v ? "Gift shown in app" : "Gift hidden"))
                          .catch((e) => toast.error(e.message))} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(g)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label="Delete" onClick={() =>
                        mutate(() => api(`/admin/gifts/${g.id}`, { method: "DELETE" }), g.id, null)
                          .then(() => toast.success("Gift removed"))
                          .catch((e) => toast.error(e.message))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cash-out minimum</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Members can request a withdrawal once their received gift value reaches this amount.</p>
            <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            <Button onClick={saveThreshold}>Save minimum</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit gift" : "New gift"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div className="grid grid-cols-4 gap-2">
                <div><Label>Icon</Label><Input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} /></div>
                <div className="col-span-3"><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              </div>
              <div><Label>Price the buyer pays</Label><Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
              <div><Label>Value credited to the receiver</Label><Input type="number" value={edit.payoutValue} onChange={(e) => setEdit({ ...edit, payoutValue: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveGift}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
