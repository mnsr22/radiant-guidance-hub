import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { TicketPercent, Plus, Copy, Download, Ban } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/admin/layout";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/discounts")({
  component: DiscountsPage,
  head: () => ({
    meta: [
      { title: "Discount Codes — Halal Connect Admin" },
      {
        name: "description",
        content:
          "Create, track and revoke promo codes for Halal Connect subscriptions, with redemption limits, expiry dates and plan targeting.",
      },
      { property: "og:title", content: "Discount Codes — Halal Connect Admin" },
      { property: "og:description", content: "Promo codes and redemption tracking for Halal Connect plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Code = {
  id: string;
  code: string;
  type: "percent" | "amount" | "free_trial";
  value: number;
  plan: string;
  limit: number;
  redeemed: number;
  expires: string;
  active: boolean;
};

const initialCodes: Code[] = [
  { id: "dsc_1", code: "RAMADAN25", type: "percent", value: 25, plan: "All plans", limit: 1000, redeemed: 412, expires: "2026-04-10", active: true },
  { id: "dsc_2", code: "NIKAH50", type: "percent", value: 50, plan: "Premium yearly", limit: 200, redeemed: 188, expires: "2026-06-30", active: true },
  { id: "dsc_3", code: "WELCOME7", type: "free_trial", value: 7, plan: "Premium monthly", limit: 5000, redeemed: 2340, expires: "2026-12-31", active: true },
  { id: "dsc_4", code: "EIDGIFT", type: "amount", value: 5, plan: "All plans", limit: 500, redeemed: 500, expires: "2026-03-30", active: false },
  { id: "dsc_5", code: "MASJIDPARTNER", type: "percent", value: 30, plan: "VIP", limit: 100, redeemed: 27, expires: "2026-09-01", active: true },
];

const typeLabel = (c: Code) =>
  c.type === "percent" ? `${c.value}% off` : c.type === "amount" ? `$${c.value} off` : `${c.value}-day free trial`;

function DiscountsPage() {
  const [codes, setCodes] = useState<Code[]>(initialCodes);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ code: "", type: "percent", value: "20", plan: "All plans", limit: "500", expires: "" });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return codes.filter((c) => !q || c.code.toLowerCase().includes(q) || c.plan.toLowerCase().includes(q));
  }, [codes, search]);

  const totalRedeemed = codes.reduce((s, c) => s + c.redeemed, 0);
  const activeCount = codes.filter((c) => c.active).length;

  const create = () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) return toast.error("Enter a code");
    if (codes.some((c) => c.code === code)) return toast.error("That code already exists");
    setCodes((prev) => [
      {
        id: `dsc_${Date.now()}`,
        code,
        type: draft.type as Code["type"],
        value: Number(draft.value) || 0,
        plan: draft.plan,
        limit: Number(draft.limit) || 0,
        redeemed: 0,
        expires: draft.expires || "—",
        active: true,
      },
      ...prev,
    ]);
    setOpen(false);
    setDraft({ code: "", type: "percent", value: "20", plan: "All plans", limit: "500", expires: "" });
    toast.success(`${code} created`);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Discount Codes"
        description="Promo codes for subscriptions — limits, expiry, plan targeting and live redemption counts."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadCSV("discount-codes", filtered);
                toast.success("Codes exported");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create discount code</DialogTitle>
                  <DialogDescription>Codes apply at checkout in the mobile app.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                      placeholder="RAMADAN25"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percent off</SelectItem>
                          <SelectItem value="amount">Fixed amount off</SelectItem>
                          <SelectItem value="free_trial">Free trial days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        value={draft.value}
                        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Plan</Label>
                      <Select value={draft.plan} onValueChange={(v) => setDraft({ ...draft, plan: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All plans">All plans</SelectItem>
                          <SelectItem value="Premium monthly">Premium monthly</SelectItem>
                          <SelectItem value="Premium yearly">Premium yearly</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Redemption limit</Label>
                      <Input
                        type="number"
                        value={draft.limit}
                        onChange={(e) => setDraft({ ...draft, limit: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Expires</Label>
                    <Input type="date" value={draft.expires} onChange={(e) => setDraft({ ...draft, expires: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={create}>Create code</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Active codes" value={String(activeCount)} icon={TicketPercent} />
        <StatCard label="Total redemptions" value={totalRedeemed.toLocaleString()} icon={TicketPercent} />
        <StatCard label="Codes created" value={String(codes.length)} icon={TicketPercent} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>All codes</CardTitle>
              <CardDescription>Revoke a code to stop new redemptions immediately.</CardDescription>
            </div>
            <Input
              placeholder="Search code or plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:w-72"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No codes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{typeLabel(c)}</TableCell>
                      <TableCell>{c.plan}</TableCell>
                      <TableCell>
                        {c.redeemed} / {c.limit}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.expires}</TableCell>
                      <TableCell>
                        <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Revoked"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard?.writeText(c.code);
                              toast.success(`${c.code} copied`);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCodes((prev) =>
                                prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)),
                              );
                              toast.success(c.active ? `${c.code} revoked` : `${c.code} reactivated`);
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
